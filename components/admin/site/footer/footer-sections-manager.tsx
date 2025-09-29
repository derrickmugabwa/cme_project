"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Save, Edit3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FooterSection {
  id: string;
  title: string;
  order_index: number;
  is_enabled: boolean;
}

interface FooterSectionsManagerProps {
  sections: FooterSection[];
  onUpdate: (sections: FooterSection[]) => void;
}

export function FooterSectionsManager({ sections, onUpdate }: FooterSectionsManagerProps) {
  const [localSections, setLocalSections] = useState<FooterSection[]>(sections);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FooterSection | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(localSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index
    }));

    setLocalSections(updatedItems);
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Section title is required",
        variant: "destructive",
      });
      return;
    }

    const newSection: FooterSection = {
      id: `temp-${Date.now()}`,
      title: newSectionTitle.trim(),
      order_index: localSections.length,
      is_enabled: true,
    };

    setLocalSections([...localSections, newSection]);
    setNewSectionTitle("");
    setIsDialogOpen(false);
  };

  const handleEditSection = (section: FooterSection) => {
    setEditingSection(section);
    setNewSectionTitle(section.title);
    setIsDialogOpen(true);
  };

  const handleUpdateSection = () => {
    if (!editingSection || !newSectionTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Section title is required",
        variant: "destructive",
      });
      return;
    }

    const updatedSections = localSections.map(section =>
      section.id === editingSection.id
        ? { ...section, title: newSectionTitle.trim() }
        : section
    );

    setLocalSections(updatedSections);
    setEditingSection(null);
    setNewSectionTitle("");
    setIsDialogOpen(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = localSections
      .filter(section => section.id !== sectionId)
      .map((section, index) => ({ ...section, order_index: index }));
    
    setLocalSections(updatedSections);
  };

  const handleToggleSection = (sectionId: string) => {
    const updatedSections = localSections.map(section =>
      section.id === sectionId
        ? { ...section, is_enabled: !section.is_enabled }
        : section
    );
    setLocalSections(updatedSections);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete all existing sections
      const { error: deleteError } = await supabase
        .from('footer_sections')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      // Insert updated sections
      const sectionsToInsert = localSections.map(section => ({
        ...section,
        id: section.id.startsWith('temp-') ? undefined : section.id
      }));

      const { error: insertError } = await supabase
        .from('footer_sections')
        .insert(sectionsToInsert);

      if (insertError) throw insertError;

      // Refresh data
      const { data: refreshedData, error: refreshError } = await supabase
        .from('footer_sections')
        .select('*')
        .order('order_index');

      if (refreshError) throw refreshError;

      setLocalSections(refreshedData || []);
      onUpdate(refreshedData || []);

      toast({
        title: "Success",
        description: "Footer sections saved successfully",
      });
    } catch (error) {
      console.error('Error saving footer sections:', error);
      toast({
        title: "Error",
        description: "Failed to save footer sections",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetDialog = () => {
    setEditingSection(null);
    setNewSectionTitle("");
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer Sections</CardTitle>
        <CardDescription>
          Manage the main sections in your footer. Drag to reorder, toggle to enable/disable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="footer-sections">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {localSections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800 ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </div>
                        
                        <div className="flex-1">
                          <span className="font-medium">{section.title}</span>
                        </div>
                        
                        <Switch
                          checked={section.is_enabled}
                          onCheckedChange={() => handleToggleSection(section.id)}
                        />
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSection(section)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSection ? 'Edit Section' : 'Add New Section'}
                </DialogTitle>
                <DialogDescription>
                  {editingSection 
                    ? 'Update the section title below.' 
                    : 'Enter a title for the new footer section.'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="section-title">Section Title</Label>
                  <Input
                    id="section-title"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="e.g., Platform, Resources, Company"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  Cancel
                </Button>
                <Button onClick={editingSection ? handleUpdateSection : handleAddSection}>
                  {editingSection ? 'Update' : 'Add'} Section
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
