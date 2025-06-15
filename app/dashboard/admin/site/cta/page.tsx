"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, ArrowRight } from "lucide-react";

interface CtaSection {
  id: string;
  title: string;
  subtitle: string;
  description?: string; // For backward compatibility
  primary_button_text: string;
  button_primary_text?: string; // For backward compatibility
  primary_button_url: string;
  secondary_button_text: string | null;
  button_secondary_text?: string; // For backward compatibility
  secondary_button_url: string | null;
  background_image_url: string | null;
}

export default function CtaSectionPage() {
  const [ctaSection, setCtaSection] = useState<CtaSection>({
    id: "",
    title: "",
    subtitle: "",
    primary_button_text: "",
    primary_button_url: "",
    secondary_button_text: null,
    secondary_button_url: null,
    background_image_url: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCtaSection() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('landing_cta')
          .select('*')
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error('Error fetching CTA section:', error);
          toast({
            title: "Error",
            description: "Failed to load CTA section. Please try again.",
            variant: "destructive",
          });
        } else if (data) {
          // Handle different column naming conventions
          const processedData = {
            ...data,
            subtitle: data.subtitle || data.description || '',
            primary_button_text: data.primary_button_text || data.button_primary_text || '',
            secondary_button_text: data.secondary_button_text || data.button_secondary_text || null
          };
          
          setCtaSection(processedData);
          setPreviewImage(data.background_image_url);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCtaSection();
  }, [supabase, toast]);
  
  const handleChange = (field: keyof CtaSection, value: string | null) => {
    setCtaSection({
      ...ctaSection,
      [field]: value
    });
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSave = async () => {
    // Validate required fields
    if (!ctaSection.title || !ctaSection.subtitle || !ctaSection.primary_button_text || !ctaSection.primary_button_url) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let backgroundImageUrl = ctaSection.background_image_url;
      
      // Upload image if a new one was selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `cta-background-${Date.now()}.${fileExt}`;
        const filePath = `site-assets/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('content')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('content')
          .getPublicUrl(filePath);
          
        backgroundImageUrl = publicUrl;
      }
      
      // Check if a record already exists
      const { data: existingData } = await supabase
        .from('landing_cta')
        .select('id')
        .single();
      
      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('landing_cta')
          .update({
            title: ctaSection.title,
            subtitle: ctaSection.subtitle,
            description: ctaSection.subtitle, // Update both columns for compatibility
            primary_button_text: ctaSection.primary_button_text,
            button_primary_text: ctaSection.primary_button_text, // Update both columns for compatibility
            primary_button_url: ctaSection.primary_button_url,
            secondary_button_text: ctaSection.secondary_button_text,
            button_secondary_text: ctaSection.secondary_button_text, // Update both columns for compatibility
            secondary_button_url: ctaSection.secondary_button_url,
            background_image_url: backgroundImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);
          
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('landing_cta')
          .insert({
            title: ctaSection.title,
            subtitle: ctaSection.subtitle,
            primary_button_text: ctaSection.primary_button_text,
            primary_button_url: ctaSection.primary_button_url,
            secondary_button_text: ctaSection.secondary_button_text,
            secondary_button_url: ctaSection.secondary_button_url,
            background_image_url: backgroundImageUrl
          });
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "CTA section has been updated.",
      });
      
      // Refresh the data
      const { data, error } = await supabase
        .from('landing_cta')
        .select('*')
        .single();
        
      if (error) throw error;
      if (data) {
        setCtaSection(data);
        setPreviewImage(data.background_image_url);
        setImageFile(null);
      }
      
    } catch (error) {
      console.error('Error saving CTA section:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
        <h2 className="text-xl font-semibold tracking-tight">Call to Action Section</h2>
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
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={ctaSection.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Main heading for the CTA section"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={ctaSection.subtitle}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="Supporting text for the CTA section"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primary_button_text">Primary Button Text</Label>
                <Input
                  id="primary_button_text"
                  value={ctaSection.primary_button_text}
                  onChange={(e) => handleChange('primary_button_text', e.target.value)}
                  placeholder="e.g., Get Started"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primary_button_url">Primary Button URL</Label>
                <Input
                  id="primary_button_url"
                  value={ctaSection.primary_button_url}
                  onChange={(e) => handleChange('primary_button_url', e.target.value)}
                  placeholder="e.g., /auth/register"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondary_button_text">Secondary Button Text (Optional)</Label>
                <Input
                  id="secondary_button_text"
                  value={ctaSection.secondary_button_text || ""}
                  onChange={(e) => handleChange('secondary_button_text', e.target.value || null)}
                  placeholder="e.g., Learn More"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondary_button_url">Secondary Button URL (Optional)</Label>
                <Input
                  id="secondary_button_url"
                  value={ctaSection.secondary_button_url || ""}
                  onChange={(e) => handleChange('secondary_button_url', e.target.value || null)}
                  placeholder="e.g., /about"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background_image">Background Image (Optional)</Label>
                <Input
                  id="background_image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 1920x600px. A dark or gradient image works best for text visibility.
                </p>
              </div>
              
              <div className="pt-4">
                <div className="relative overflow-hidden rounded-lg border">
                  <div 
                    className={`p-6 ${previewImage ? 'bg-cover bg-center' : 'bg-gradient-to-r from-primary/20 to-primary/10'}`}
                    style={previewImage ? { backgroundImage: `url(${previewImage})` } : {}}
                  >
                    <div className="relative z-10 p-6 text-center space-y-4 bg-black/40 backdrop-blur-sm rounded-lg text-white">
                      <h3 className="text-xl font-bold">
                        {ctaSection.title || "Your CTA Title Here"}
                      </h3>
                      <p className="text-sm">
                        {ctaSection.subtitle || "Your supporting text will appear here. Make it compelling!"}
                      </p>
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Button size="sm" className="gap-1">
                          {ctaSection.primary_button_text || "Primary Button"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {(ctaSection.secondary_button_text && ctaSection.secondary_button_url) && (
                          <Button size="sm" variant="outline" className="text-white border-white hover:bg-white/20 hover:text-white">
                            {ctaSection.secondary_button_text}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
