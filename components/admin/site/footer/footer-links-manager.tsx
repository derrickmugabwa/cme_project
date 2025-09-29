"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, Trash2, Save, Edit3, ExternalLink } from "lucide-react";
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

interface FooterLink {
  id: string;
  section_id: string;
  name: string;
  href: string;
  order_index: number;
  is_enabled: boolean;
  opens_new_tab: boolean;
}

interface FooterLinksManagerProps {
  sections: FooterSection[];
  links: FooterLink[];
  onUpdate: (links: FooterLink[]) => void;
}

export function FooterLinksManager({ sections, links, onUpdate }: FooterLinksManagerProps) {
  const [localLinks, setLocalLinks] = useState<FooterLink[]>(links);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [linkForm, setLinkForm] = useState({
    name: "",
    href: "",
    section_id: "",
    opens_new_tab: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const enabledSections = sections.filter(section => section.is_enabled);
  const filteredLinks = selectedSectionId 
    ? localLinks.filter(link => link.section_id === selectedSectionId)
    : localLinks;

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const sectionLinks = filteredLinks;
    const items = Array.from(sectionLinks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for reordered items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index
    }));

    // Update the full links array
    const updatedLinks = localLinks.map(link => {
      const updatedItem = updatedItems.find(item => item.id === link.id);
      return updatedItem || link;
    });

    setLocalLinks(updatedLinks);
  };

  const handleAddLink = () => {
    if (!linkForm.name.trim() || !linkForm.href.trim() || !linkForm.section_id) {
      toast({
        title: "Validation Error",
        description: "Name, URL, and section are required",
        variant: "destructive",
      });
      return;
    }

    const sectionLinks = localLinks.filter(link => link.section_id === linkForm.section_id);
    const newLink: FooterLink = {
      id: `temp-${Date.now()}`,
      name: linkForm.name.trim(),
      href: linkForm.href.trim(),
      section_id: linkForm.section_id,
      order_index: sectionLinks.length,
      is_enabled: true,
      opens_new_tab: linkForm.opens_new_tab,
    };

    setLocalLinks([...localLinks, newLink]);
    resetForm();
  };

  const handleEditLink = (link: FooterLink) => {
    setEditingLink(link);
    setLinkForm({
      name: link.name,
      href: link.href,
      section_id: link.section_id,
      opens_new_tab: link.opens_new_tab,
    });
    setIsDialogOpen(true);
  };

  const handleUpdateLink = () => {
    if (!editingLink || !linkForm.name.trim() || !linkForm.href.trim() || !linkForm.section_id) {
      toast({
        title: "Validation Error",
        description: "Name, URL, and section are required",
        variant: "destructive",
      });
      return;
    }

    const updatedLinks = localLinks.map(link =>
      link.id === editingLink.id
        ? {
            ...link,
            name: linkForm.name.trim(),
            href: linkForm.href.trim(),
            section_id: linkForm.section_id,
            opens_new_tab: linkForm.opens_new_tab,
          }
        : link
    );

    setLocalLinks(updatedLinks);
    resetForm();
  };

  const handleDeleteLink = (linkId: string) => {
    const updatedLinks = localLinks.filter(link => link.id !== linkId);
    setLocalLinks(updatedLinks);
  };

  const handleToggleLink = (linkId: string) => {
    const updatedLinks = localLinks.map(link =>
      link.id === linkId
        ? { ...link, is_enabled: !link.is_enabled }
        : link
    );
    setLocalLinks(updatedLinks);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete all existing links
      const { error: deleteError } = await supabase
        .from('footer_links')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      // Insert updated links
      const linksToInsert = localLinks.map(link => ({
        ...link,
        id: link.id.startsWith('temp-') ? undefined : link.id
      }));

      const { error: insertError } = await supabase
        .from('footer_links')
        .insert(linksToInsert);

      if (insertError) throw insertError;

      // Refresh data
      const { data: refreshedData, error: refreshError } = await supabase
        .from('footer_links')
        .select('*')
        .order('section_id, order_index');

      if (refreshError) throw refreshError;

      setLocalLinks(refreshedData || []);
      onUpdate(refreshedData || []);

      toast({
        title: "Success",
        description: "Footer links saved successfully",
      });
    } catch (error) {
      console.error('Error saving footer links:', error);
      toast({
        title: "Error",
        description: "Failed to save footer links",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingLink(null);
    setLinkForm({
      name: "",
      href: "",
      section_id: "",
      opens_new_tab: false,
    });
    setIsDialogOpen(false);
  };

  const getSectionTitle = (sectionId: string) => {
    return sections.find(section => section.id === sectionId)?.title || "Unknown Section";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer Links</CardTitle>
        <CardDescription>
          Manage individual links within each footer section. Select a section to view and edit its links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Label htmlFor="section-filter">Filter by Section</Label>
            <Select value={selectedSectionId || "all"} onValueChange={(value) => setSelectedSectionId(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {enabledSections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="footer-links">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {filteredLinks.map((link, index) => (
                  <Draggable key={link.id} draggableId={link.id} index={index}>
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{link.name}</span>
                            {link.opens_new_tab && (
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {link.href} • {getSectionTitle(link.section_id)}
                          </div>
                        </div>
                        
                        <Switch
                          checked={link.is_enabled}
                          onCheckedChange={() => handleToggleLink(link.id)}
                        />
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLink(link)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLink(link.id)}
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
              <Button variant="outline" onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLink ? 'Edit Link' : 'Add New Link'}
                </DialogTitle>
                <DialogDescription>
                  {editingLink 
                    ? 'Update the link details below.' 
                    : 'Enter details for the new footer link.'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-name">Link Name</Label>
                  <Input
                    id="link-name"
                    value={linkForm.name}
                    onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                    placeholder="e.g., About Us, Privacy Policy"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="link-href">URL</Label>
                  <Input
                    id="link-href"
                    value={linkForm.href}
                    onChange={(e) => setLinkForm({ ...linkForm, href: e.target.value })}
                    placeholder="e.g., /about, https://example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="link-section">Section</Label>
                  <Select 
                    value={linkForm.section_id} 
                    onValueChange={(value) => setLinkForm({ ...linkForm, section_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="opens-new-tab" className="cursor-pointer">
                    Open in New Tab
                  </Label>
                  <Switch
                    id="opens-new-tab"
                    checked={linkForm.opens_new_tab}
                    onCheckedChange={(checked) => setLinkForm({ ...linkForm, opens_new_tab: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={editingLink ? handleUpdateLink : handleAddLink}>
                  {editingLink ? 'Update' : 'Add'} Link
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
