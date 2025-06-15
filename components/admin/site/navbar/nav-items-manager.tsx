"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2, ExternalLink } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  url: string;
  is_external: boolean;
  order_index: number;
}

interface NavItemsManagerProps {
  initialItems: NavItem[];
  onSave: (items: NavItem[]) => Promise<void>;
}

export function NavItemsManager({ initialItems, onSave }: NavItemsManagerProps) {
  const [navItems, setNavItems] = useState<NavItem[]>(initialItems || []);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleAddItem = () => {
    const newItem: NavItem = {
      id: `temp-${Date.now()}`,
      label: "",
      url: "",
      is_external: false,
      order_index: navItems.length,
    };
    setNavItems([...navItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...navItems];
    updatedItems.splice(index, 1);
    // Update order_index for remaining items
    const reorderedItems = updatedItems.map((item, idx) => ({
      ...item,
      order_index: idx,
    }));
    setNavItems(reorderedItems);
  };

  const handleItemChange = (index: number, field: keyof NavItem, value: string | boolean) => {
    const updatedItems = [...navItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setNavItems(updatedItems);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(navItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order_index for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index,
    }));
    
    setNavItems(updatedItems);
  };

  const handleSave = async () => {
    // Validate all items have label and URL
    const invalidItems = navItems.filter(item => !item.label || !item.url);
    if (invalidItems.length > 0) {
      toast({
        title: "Validation error",
        description: "All navigation items must have a label and URL.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(navItems);
      toast({
        title: "Navigation saved",
        description: "The navigation items have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "There was an error saving the navigation items.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation Items</CardTitle>
        <CardDescription>
          Manage the navigation links that appear in your site header. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="nav-items">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {navItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided: DraggableProvided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-start gap-2 p-4 border rounded-md bg-white dark:bg-gray-800"
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="mt-2 cursor-grab"
                        >
                          <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`label-${index}`}>Label</Label>
                            <Input
                              id={`label-${index}`}
                              value={item.label}
                              onChange={(e) => handleItemChange(index, "label", e.target.value)}
                              placeholder="Home"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`url-${index}`}>URL</Label>
                            <Input
                              id={`url-${index}`}
                              value={item.url}
                              onChange={(e) => handleItemChange(index, "url", e.target.value)}
                              placeholder="/about"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`external-${index}`}
                              checked={item.is_external}
                              onCheckedChange={(checked) => handleItemChange(index, "is_external", checked)}
                            />
                            <Label htmlFor={`external-${index}`} className="flex items-center gap-1">
                              External Link <ExternalLink className="h-3 w-3" />
                            </Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5" />
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

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleAddItem}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Navigation Item
        </Button>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Navigation"}
        </Button>
      </CardFooter>
    </Card>
  );
}
