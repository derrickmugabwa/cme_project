"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Eye } from "lucide-react";
import Image from "next/image";

interface HeroContent {
  id: string;
  title: string;
  subtitle: string;
  cta_primary_text: string;
  cta_secondary_text: string;
  image_url: string | null;
}

export default function HeroSectionPage() {
  const [content, setContent] = useState<HeroContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchHeroContent() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('landing_hero')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
          
        if (error) {
          console.error('Error fetching hero content:', error);
          toast({
            title: "Error",
            description: "Failed to load hero section content. Please try again.",
            variant: "destructive",
          });
        } else if (data) {
          setContent(data);
          if (data.image_url) {
            setPreviewImage(data.image_url);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchHeroContent();
  }, [supabase, toast]);
  
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
    if (!content) return;
    
    setIsSaving(true);
    
    try {
      let imageUrl = content.image_url;
      
      // Upload image if a new one was selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `hero-${Date.now()}.${fileExt}`;
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
          
        imageUrl = publicUrl;
      }
      
      // Update the hero content
      const { error } = await supabase
        .from('landing_hero')
        .update({
          title: content.title,
          subtitle: content.subtitle,
          cta_primary_text: content.cta_primary_text,
          cta_secondary_text: content.cta_secondary_text,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', content.id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Hero section content has been updated.",
      });
    } catch (error) {
      console.error('Error saving hero content:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePreview = () => {
    window.open('/', '_blank');
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">No hero content found. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Hero Section</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handlePreview}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
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
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={content.title}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  placeholder="Main heading for hero section"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={content.subtitle}
                  onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                  placeholder="Supporting text for the hero section"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryCta">Primary Button Text</Label>
                  <Input
                    id="primaryCta"
                    value={content.cta_primary_text}
                    onChange={(e) => setContent({ ...content, cta_primary_text: e.target.value })}
                    placeholder="e.g., Get Started"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryCta">Secondary Button Text</Label>
                  <Input
                    id="secondaryCta"
                    value={content.cta_secondary_text}
                    onChange={(e) => setContent({ ...content, cta_secondary_text: e.target.value })}
                    placeholder="e.g., Learn More"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="heroImage">Hero Image</Label>
                <Input
                  id="heroImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 1200x800px, max 500KB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="font-medium">Preview</h3>
              
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <h1 className="text-2xl font-bold">{content.title}</h1>
                <p className="mt-2 text-muted-foreground">{content.subtitle}</p>
                
                <div className="flex gap-3 mt-4">
                  <Button size="sm">{content.cta_primary_text}</Button>
                  <Button size="sm" variant="outline">{content.cta_secondary_text}</Button>
                </div>
              </div>
              
              {previewImage && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Image Preview</h3>
                  <div className="relative h-48 w-full overflow-hidden rounded-lg border">
                    <Image
                      src={previewImage}
                      alt="Hero image preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
