"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  Video,
  ClipboardCheck,
  Award,
  FileText,
  BarChart4,
  Zap,
  Globe,
  Shield
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  order_index: number;
}

const iconOptions = [
  { value: "Video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { value: "ClipboardCheck", label: "Clipboard Check", icon: <ClipboardCheck className="h-4 w-4" /> },
  { value: "Award", label: "Award", icon: <Award className="h-4 w-4" /> },
  { value: "FileText", label: "File Text", icon: <FileText className="h-4 w-4" /> },
  { value: "BarChart4", label: "Chart", icon: <BarChart4 className="h-4 w-4" /> },
  { value: "Zap", label: "Lightning", icon: <Zap className="h-4 w-4" /> },
  { value: "Globe", label: "Globe", icon: <Globe className="h-4 w-4" /> },
  { value: "Shield", label: "Shield", icon: <Shield className="h-4 w-4" /> },
];

export default function FeaturesSectionPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchFeatures() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('landing_features')
          .select('*')
          .order('order_index', { ascending: true });
          
        if (error) {
          console.error('Error fetching features:', error);
          toast({
            title: "Error",
            description: "Failed to load features. Please try again.",
            variant: "destructive",
          });
        } else if (data) {
          setFeatures(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchFeatures();
  }, [supabase, toast]);
  
  const handleAddFeature = () => {
    const newOrder = features.length > 0 
      ? Math.max(...features.map(f => f.order_index)) + 1 
      : 1;
      
    setFeatures([
      ...features, 
      { 
        id: `new-${Date.now()}`, 
        title: "", 
        description: "", 
        icon: "Video", 
        order_index: newOrder 
      }
    ]);
  };
  
  const handleRemoveFeature = (index: number) => {
    const updatedFeatures = [...features];
    updatedFeatures.splice(index, 1);
    
    // Reorder the remaining features
    const reorderedFeatures = updatedFeatures.map((feature, idx) => ({
      ...feature,
      order_index: idx + 1
    }));
    
    setFeatures(reorderedFeatures);
  };
  
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const updatedFeatures = [...features];
    [updatedFeatures[index - 1], updatedFeatures[index]] = [updatedFeatures[index], updatedFeatures[index - 1]];
    
    // Update order indexes
    const reorderedFeatures = updatedFeatures.map((feature, idx) => ({
      ...feature,
      order_index: idx + 1
    }));
    
    setFeatures(reorderedFeatures);
  };
  
  const handleMoveDown = (index: number) => {
    if (index === features.length - 1) return;
    
    const updatedFeatures = [...features];
    [updatedFeatures[index], updatedFeatures[index + 1]] = [updatedFeatures[index + 1], updatedFeatures[index]];
    
    // Update order indexes
    const reorderedFeatures = updatedFeatures.map((feature, idx) => ({
      ...feature,
      order_index: idx + 1
    }));
    
    setFeatures(reorderedFeatures);
  };
  
  const handleChange = (index: number, field: keyof Feature, value: string | number) => {
    const updatedFeatures = [...features];
    updatedFeatures[index] = {
      ...updatedFeatures[index],
      [field]: value
    };
    setFeatures(updatedFeatures);
  };
  
  const handleSave = async () => {
    if (features.length === 0) return;
    
    // Validate all fields
    const invalidFeatures = features.filter(
      f => !f.title || !f.description || !f.icon
    );
    
    if (invalidFeatures.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields for each feature.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get existing features from database
      const { data: existingFeatures } = await supabase
        .from('landing_features')
        .select('id');
      
      const existingIds = existingFeatures?.map(f => f.id) || [];
      
      // Separate features to update and create
      const featuresToUpdate = features.filter(f => existingIds.includes(f.id));
      const featuresToCreate = features.filter(f => !existingIds.includes(f.id));
      const idsToKeep = features.filter(f => existingIds.includes(f.id)).map(f => f.id);
      const idsToDelete = existingIds.filter(id => !idsToKeep.includes(id));
      
      // Delete features that were removed
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('landing_features')
          .delete()
          .in('id', idsToDelete);
          
        if (deleteError) throw deleteError;
      }
      
      // Update existing features
      for (const feature of featuresToUpdate) {
        const { error } = await supabase
          .from('landing_features')
          .update({
            title: feature.title,
            description: feature.description,
            icon: feature.icon,
            order_index: feature.order_index,
            updated_at: new Date().toISOString()
          })
          .eq('id', feature.id);
          
        if (error) throw error;
      }
      
      // Create new features
      if (featuresToCreate.length > 0) {
        const { error } = await supabase
          .from('landing_features')
          .insert(
            featuresToCreate.map(f => ({
              title: f.title,
              description: f.description,
              icon: f.icon,
              order_index: f.order_index
            }))
          );
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Features have been updated.",
      });
      
      // Refresh the features list
      const { data, error } = await supabase
        .from('landing_features')
        .select('*')
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      if (data) setFeatures(data);
      
    } catch (error) {
      console.error('Error saving features:', error);
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
    return icon ? icon.icon : <Video className="h-4 w-4" />;
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
        <h2 className="text-xl font-semibold tracking-tight">Features Section</h2>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1"
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
        {features.map((feature, index) => (
          <Card key={feature.id} className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${index}`}>Title</Label>
                    <Input
                      id={`title-${index}`}
                      value={feature.title}
                      onChange={(e) => handleChange(index, 'title', e.target.value)}
                      placeholder="Feature title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`description-${index}`}>Description</Label>
                    <Textarea
                      id={`description-${index}`}
                      value={feature.description}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                      placeholder="Feature description"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`icon-${index}`}>Icon</Label>
                    <Select
                      value={feature.icon}
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
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          {getIconComponent(feature.icon)}
                        </div>
                        <div>
                          <h3 className="font-medium">{feature.title || "Feature Title"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {feature.description || "Feature description will appear here"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between bg-muted/40 px-6 py-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Order: {feature.order_index}</span>
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
                  disabled={index === features.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFeature(index)}
                  className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
        
        <Button
          variant="outline"
          className="w-full gap-1"
          onClick={handleAddFeature}
        >
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </div>
    </div>
  );
}
