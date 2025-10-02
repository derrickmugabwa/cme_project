"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  User,
  Video,
  Award,
  ThumbsUp,
  BarChart4,
  Users,
  Clock,
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Stat {
  id: string;
  title: string;
  value: string;
  icon: string;
  order_index: number;
}

const iconOptions = [
  { value: "User", label: "User", icon: <User className="h-4 w-4" /> },
  { value: "Users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { value: "Video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { value: "Award", label: "Award", icon: <Award className="h-4 w-4" /> },
  { value: "ThumbsUp", label: "Thumbs Up", icon: <ThumbsUp className="h-4 w-4" /> },
  { value: "BarChart4", label: "Chart", icon: <BarChart4 className="h-4 w-4" /> },
  { value: "Clock", label: "Clock", icon: <Clock className="h-4 w-4" /> },
  { value: "Calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
];

export default function StatsSectionPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('landing_stats')
          .select('*')
          .order('order_index', { ascending: true });
          
        if (error) {
          console.error('Error fetching stats:', error);
          toast({
            title: "Error",
            description: "Failed to load statistics. Please try again.",
            variant: "destructive",
          });
        } else if (data) {
          setStats(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStats();
  }, [supabase, toast]);
  
  const handleAddStat = () => {
    const newOrder = stats.length > 0 
      ? Math.max(...stats.map(s => s.order_index)) + 1 
      : 1;
      
    setStats([
      ...stats, 
      { 
        id: `new-${Date.now()}`, 
        title: "", 
        value: "", 
        icon: "BarChart4", 
        order_index: newOrder 
      }
    ]);
  };
  
  const handleRemoveStat = (index: number) => {
    const updatedStats = [...stats];
    updatedStats.splice(index, 1);
    
    // Reorder the remaining stats
    const reorderedStats = updatedStats.map((stat, idx) => ({
      ...stat,
      order_index: idx + 1
    }));
    
    setStats(reorderedStats);
  };
  
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const updatedStats = [...stats];
    [updatedStats[index - 1], updatedStats[index]] = [updatedStats[index], updatedStats[index - 1]];
    
    // Update order indexes
    const reorderedStats = updatedStats.map((stat, idx) => ({
      ...stat,
      order_index: idx + 1
    }));
    
    setStats(reorderedStats);
  };
  
  const handleMoveDown = (index: number) => {
    if (index === stats.length - 1) return;
    
    const updatedStats = [...stats];
    [updatedStats[index], updatedStats[index + 1]] = [updatedStats[index + 1], updatedStats[index]];
    
    // Update order indexes
    const reorderedStats = updatedStats.map((stat, idx) => ({
      ...stat,
      order_index: idx + 1
    }));
    
    setStats(reorderedStats);
  };
  
  const handleChange = (index: number, field: keyof Stat, value: string | number) => {
    const updatedStats = [...stats];
    updatedStats[index] = {
      ...updatedStats[index],
      [field]: value
    };
    setStats(updatedStats);
  };
  
  const handleSave = async () => {
    if (stats.length === 0) return;
    
    // Validate all fields
    const invalidStats = stats.filter(
      s => !s.title || !s.value || !s.icon
    );
    
    if (invalidStats.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields for each statistic.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get existing stats from database
      const { data: existingStats } = await supabase
        .from('landing_stats')
        .select('id');
      
      const existingIds = existingStats?.map(s => s.id) || [];
      
      // Separate stats to update and create
      const statsToUpdate = stats.filter(s => existingIds.includes(s.id));
      const statsToCreate = stats.filter(s => !existingIds.includes(s.id));
      const idsToKeep = stats.filter(s => existingIds.includes(s.id)).map(s => s.id);
      const idsToDelete = existingIds.filter(id => !idsToKeep.includes(id));
      
      // Delete stats that were removed
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('landing_stats')
          .delete()
          .in('id', idsToDelete);
          
        if (deleteError) throw deleteError;
      }
      
      // Update existing stats
      for (const stat of statsToUpdate) {
        const { error } = await supabase
          .from('landing_stats')
          .update({
            title: stat.title,
            value: stat.value,
            icon: stat.icon,
            order_index: stat.order_index,
            updated_at: new Date().toISOString()
          })
          .eq('id', stat.id);
          
        if (error) throw error;
      }
      
      // Create new stats
      if (statsToCreate.length > 0) {
        const { error } = await supabase
          .from('landing_stats')
          .insert(
            statsToCreate.map(s => ({
              title: s.title,
              value: s.value,
              icon: s.icon,
              order_index: s.order_index
            }))
          );
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Statistics have been updated.",
      });
      
      // Refresh the stats list
      const { data, error } = await supabase
        .from('landing_stats')
        .select('*')
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      if (data) setStats(data);
      
    } catch (error) {
      console.error('Error saving stats:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getIconComponent = (iconName: string) => {
    const icon = iconOptions.find(i => i.value === iconName);
    return icon ? icon.icon : <BarChart4 className="h-4 w-4" />;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Statistics Section</h2>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1 bg-[#008C45] hover:bg-[#006633] text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={stat.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${index}`}>Title</Label>
                    <Input
                      id={`title-${index}`}
                      value={stat.title}
                      onChange={(e) => handleChange(index, 'title', e.target.value)}
                      placeholder="Statistic title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`value-${index}`}>Value</Label>
                    <Input
                      id={`value-${index}`}
                      value={stat.value}
                      onChange={(e) => handleChange(index, 'value', e.target.value)}
                      placeholder="e.g., 5,000+"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`icon-${index}`}>Icon</Label>
                    <Select
                      value={stat.icon}
                      onValueChange={(value) => handleChange(index, 'icon', value)}
                    >
                      <SelectTrigger id={`icon-${index}`}>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            <div className="flex items-center gap-2">
                              {icon.icon}
                              <span>{icon.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="pt-4">
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex flex-col items-center text-center">
                      <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                        {getIconComponent(stat.icon)}
                      </div>
                      <div className="text-2xl font-bold">{stat.value || "0"}</div>
                      <div className="text-sm text-muted-foreground mt-1">{stat.title || "Statistic Title"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between bg-muted/40 px-6 py-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Order: {stat.order_index}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === stats.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStat(index)}
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <Button
          variant="outline"
          className="w-full gap-1 border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
          onClick={handleAddStat}
        >
          <Plus className="h-4 w-4" />
          Add Statistic
        </Button>
      </div>
    </div>
  );
}
