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
  Star,
  StarHalf,
  User
} from "lucide-react";
import Image from "next/image";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar_url: string | null;
  rating: number;
  order_index: number;
}

export default function TestimonialsSectionPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImages, setPreviewImages] = useState<{[key: string]: string | null}>({});
  const [imageFiles, setImageFiles] = useState<{[key: string]: File | null}>({});
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchTestimonials() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('landing_testimonials')
          .select('*')
          .order('order_index', { ascending: true });
          
        if (error) {
          console.error('Error fetching testimonials:', error);
          toast({
            title: "Error",
            description: "Failed to load testimonials. Please try again.",
            variant: "destructive",
          });
        } else if (data) {
          setTestimonials(data);
          
          // Set up preview images
          const previews: {[key: string]: string | null} = {};
          data.forEach(testimonial => {
            previews[testimonial.id] = testimonial.avatar_url;
          });
          setPreviewImages(previews);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTestimonials();
  }, [supabase, toast]);
  
  const handleAddTestimonial = () => {
    const newOrder = testimonials.length > 0 
      ? Math.max(...testimonials.map(t => t.order_index)) + 1 
      : 1;
      
    const newId = `new-${Date.now()}`;
    
    setTestimonials([
      ...testimonials, 
      { 
        id: newId, 
        name: "", 
        role: "", 
        company: "",
        content: "", 
        avatar_url: null,
        rating: 5,
        order_index: newOrder 
      }
    ]);
    
    setPreviewImages({
      ...previewImages,
      [newId]: null
    });
    
    setImageFiles({
      ...imageFiles,
      [newId]: null
    });
  };
  
  const handleRemoveTestimonial = (index: number) => {
    const updatedTestimonials = [...testimonials];
    const removedId = updatedTestimonials[index].id;
    updatedTestimonials.splice(index, 1);
    
    // Reorder the remaining testimonials
    const reorderedTestimonials = updatedTestimonials.map((testimonial, idx) => ({
      ...testimonial,
      order_index: idx + 1
    }));
    
    setTestimonials(reorderedTestimonials);
    
    // Clean up preview and file states
    const newPreviewImages = {...previewImages};
    delete newPreviewImages[removedId];
    setPreviewImages(newPreviewImages);
    
    const newImageFiles = {...imageFiles};
    delete newImageFiles[removedId];
    setImageFiles(newImageFiles);
  };
  
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const updatedTestimonials = [...testimonials];
    [updatedTestimonials[index - 1], updatedTestimonials[index]] = [updatedTestimonials[index], updatedTestimonials[index - 1]];
    
    // Update order indexes
    const reorderedTestimonials = updatedTestimonials.map((testimonial, idx) => ({
      ...testimonial,
      order_index: idx + 1
    }));
    
    setTestimonials(reorderedTestimonials);
  };
  
  const handleMoveDown = (index: number) => {
    if (index === testimonials.length - 1) return;
    
    const updatedTestimonials = [...testimonials];
    [updatedTestimonials[index], updatedTestimonials[index + 1]] = [updatedTestimonials[index + 1], updatedTestimonials[index]];
    
    // Update order indexes
    const reorderedTestimonials = updatedTestimonials.map((testimonial, idx) => ({
      ...testimonial,
      order_index: idx + 1
    }));
    
    setTestimonials(reorderedTestimonials);
  };
  
  const handleChange = (index: number, field: keyof Testimonial, value: string | number) => {
    const updatedTestimonials = [...testimonials];
    updatedTestimonials[index] = {
      ...updatedTestimonials[index],
      [field]: value
    };
    setTestimonials(updatedTestimonials);
  };
  
  const handleImageChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFiles({
        ...imageFiles,
        [id]: file
      });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImages({
          ...previewImages,
          [id]: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSave = async () => {
    if (testimonials.length === 0) return;
    
    // Validate all fields
    const invalidTestimonials = testimonials.filter(
      t => !t.name || !t.role || !t.company || !t.content
    );
    
    if (invalidTestimonials.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields for each testimonial.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get existing testimonials from database
      const { data: existingTestimonials } = await supabase
        .from('landing_testimonials')
        .select('id');
      
      const existingIds = existingTestimonials?.map(t => t.id) || [];
      
      // Process image uploads first
      const updatedTestimonials = [...testimonials];
      
      for (let i = 0; i < updatedTestimonials.length; i++) {
        const testimonial = updatedTestimonials[i];
        const file = imageFiles[testimonial.id];
        
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `testimonial-${Date.now()}-${i}.${fileExt}`;
          const filePath = `landing/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);
            
          if (uploadError) {
            throw uploadError;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
            
          updatedTestimonials[i] = {
            ...testimonial,
            avatar_url: publicUrl
          };
        }
      }
      
      // Separate testimonials to update and create
      const testimonialsToUpdate = updatedTestimonials.filter(t => existingIds.includes(t.id));
      const testimonialsToCreate = updatedTestimonials.filter(t => !existingIds.includes(t.id));
      const idsToKeep = updatedTestimonials.filter(t => existingIds.includes(t.id)).map(t => t.id);
      const idsToDelete = existingIds.filter(id => !idsToKeep.includes(id));
      
      // Delete testimonials that were removed
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('landing_testimonials')
          .delete()
          .in('id', idsToDelete);
          
        if (deleteError) throw deleteError;
      }
      
      // Update existing testimonials
      for (const testimonial of testimonialsToUpdate) {
        const { error } = await supabase
          .from('landing_testimonials')
          .update({
            name: testimonial.name,
            role: testimonial.role,
            company: testimonial.company,
            content: testimonial.content,
            avatar_url: testimonial.avatar_url,
            rating: testimonial.rating,
            order_index: testimonial.order_index,
            updated_at: new Date().toISOString()
          })
          .eq('id', testimonial.id);
          
        if (error) throw error;
      }
      
      // Create new testimonials
      if (testimonialsToCreate.length > 0) {
        const { error } = await supabase
          .from('landing_testimonials')
          .insert(
            testimonialsToCreate.map(t => ({
              name: t.name,
              role: t.role,
              company: t.company,
              content: t.content,
              avatar_url: t.avatar_url,
              rating: t.rating,
              order_index: t.order_index
            }))
          );
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Testimonials have been updated.",
      });
      
      // Refresh the testimonials list
      const { data, error } = await supabase
        .from('landing_testimonials')
        .select('*')
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      if (data) {
        setTestimonials(data);
        
        // Update preview images
        const previews: {[key: string]: string | null} = {};
        data.forEach(testimonial => {
          previews[testimonial.id] = testimonial.avatar_url;
        });
        setPreviewImages(previews);
        
        // Clear image files
        setImageFiles({});
      }
      
    } catch (error) {
      console.error('Error saving testimonials:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<StarHalf key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    return stars;
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
        <h2 className="text-xl font-semibold tracking-tight">Testimonials Section</h2>
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
        {testimonials.map((testimonial, index) => (
          <Card key={testimonial.id} className="overflow-hidden">
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${index}`}>Name</Label>
                    <Input
                      id={`name-${index}`}
                      value={testimonial.name}
                      onChange={(e) => handleChange(index, 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`role-${index}`}>Role</Label>
                      <Input
                        id={`role-${index}`}
                        value={testimonial.role}
                        onChange={(e) => handleChange(index, 'role', e.target.value)}
                        placeholder="e.g., Cardiologist"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`company-${index}`}>Company/Institution</Label>
                      <Input
                        id={`company-${index}`}
                        value={testimonial.company}
                        onChange={(e) => handleChange(index, 'company', e.target.value)}
                        placeholder="e.g., Heart Care Center"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`content-${index}`}>Testimonial Content</Label>
                    <Textarea
                      id={`content-${index}`}
                      value={testimonial.content}
                      onChange={(e) => handleChange(index, 'content', e.target.value)}
                      placeholder="What they said about the platform"
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`rating-${index}`}>Rating (1-5)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`rating-${index}`}
                        type="number"
                        min={1}
                        max={5}
                        value={testimonial.rating}
                        onChange={(e) => handleChange(index, 'rating', Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20"
                      />
                      <div className="flex ml-2">
                        {renderRatingStars(testimonial.rating)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`avatar-${index}`}>Profile Picture</Label>
                    <Input
                      id={`avatar-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(testimonial.id, e)}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended size: 200x200px, max 200KB
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border bg-muted">
                          {previewImages[testimonial.id] ? (
                            <Image
                              src={previewImages[testimonial.id] as string}
                              alt={testimonial.name || "Avatar"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                              <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-col">
                            <span className="font-medium">{testimonial.name || "Name"}</span>
                            <span className="text-sm text-muted-foreground">
                              {testimonial.role || "Role"}{testimonial.company ? `, ${testimonial.company}` : ""}
                            </span>
                          </div>
                          <div className="flex mt-1">
                            {renderRatingStars(testimonial.rating)}
                          </div>
                          <p className="mt-2 text-sm">
                            {testimonial.content || "Testimonial content will appear here"}
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
                <span>Order: {testimonial.order_index}</span>
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
                  disabled={index === testimonials.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTestimonial(index)}
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
          className="w-full gap-1 border-[#008C45]/30 text-[#008C45] hover:bg-green-50"
          onClick={handleAddTestimonial}
        >
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Button>
      </div>
    </div>
  );
}
