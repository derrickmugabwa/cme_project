"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Globe, Mail, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface LandingSettings {
  id: string;
  site_title: string;
  site_description: string;
  contact_email: string;
  contact_phone: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  enable_hero: boolean;
  enable_features: boolean;
  enable_testimonials: boolean;
  enable_stats: boolean;
  enable_cta: boolean;
  meta_description: string;
  meta_keywords: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LandingSettings>({
    id: "",
    site_title: "",
    site_description: "",
    contact_email: "",
    contact_phone: null,
    social_facebook: null,
    social_twitter: null,
    social_instagram: null,
    social_linkedin: null,
    enable_hero: true,
    enable_features: true,
    enable_testimonials: true,
    enable_stats: true,
    enable_cta: true,
    meta_description: "",
    meta_keywords: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('landing_settings')
          .select('*')
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error('Error fetching settings:', error);
          toast({
            title: "Error",
            description: "Failed to load landing page settings. Please try again.",
            variant: "destructive",
          });
        } else if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSettings();
  }, [supabase, toast]);
  
  const handleChange = (field: keyof LandingSettings, value: string | boolean | null) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };
  
  const handleSave = async () => {
    // Validate required fields
    if (!settings.site_title || !settings.site_description || !settings.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.contact_email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Check if a record already exists
      const { data: existingData } = await supabase
        .from('landing_settings')
        .select('id')
        .single();
      
      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('landing_settings')
          .update({
            site_title: settings.site_title,
            site_description: settings.site_description,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            social_facebook: settings.social_facebook,
            social_twitter: settings.social_twitter,
            social_instagram: settings.social_instagram,
            social_linkedin: settings.social_linkedin,
            enable_hero: settings.enable_hero,
            enable_features: settings.enable_features,
            enable_testimonials: settings.enable_testimonials,
            enable_stats: settings.enable_stats,
            enable_cta: settings.enable_cta,
            meta_description: settings.meta_description,
            meta_keywords: settings.meta_keywords,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);
          
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('landing_settings')
          .insert({
            site_title: settings.site_title,
            site_description: settings.site_description,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            social_facebook: settings.social_facebook,
            social_twitter: settings.social_twitter,
            social_instagram: settings.social_instagram,
            social_linkedin: settings.social_linkedin,
            enable_hero: settings.enable_hero,
            enable_features: settings.enable_features,
            enable_testimonials: settings.enable_testimonials,
            enable_stats: settings.enable_stats,
            enable_cta: settings.enable_cta,
            meta_description: settings.meta_description,
            meta_keywords: settings.meta_keywords
          });
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Landing page settings have been updated.",
      });
      
      // Refresh the data
      const { data, error } = await supabase
        .from('landing_settings')
        .select('*')
        .single();
        
      if (error) throw error;
      if (data) {
        setSettings(data);
      }
      
    } catch (error) {
      console.error('Error saving settings:', error);
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
        <h2 className="text-xl font-semibold tracking-tight">Landing Page Settings</h2>
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
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">General Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="site_title">Site Title</Label>
                    <Input
                      id="site_title"
                      value={settings.site_title}
                      onChange={(e) => handleChange('site_title', e.target.value)}
                      placeholder="CME Platform"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="site_description">Site Description</Label>
                    <Textarea
                      id="site_description"
                      value={settings.site_description}
                      onChange={(e) => handleChange('site_description', e.target.value)}
                      placeholder="A brief description of your platform"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </span>
                      <Input
                        id="contact_email"
                        value={settings.contact_email}
                        onChange={(e) => handleChange('contact_email', e.target.value)}
                        placeholder="contact@example.com"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone (Optional)</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                        <Phone className="h-4 w-4" />
                      </span>
                      <Input
                        id="contact_phone"
                        value={settings.contact_phone || ""}
                        onChange={(e) => handleChange('contact_phone', e.target.value || null)}
                        placeholder="+1 (555) 123-4567"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Social Media Links</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="social_facebook">Facebook URL (Optional)</Label>
                    <Input
                      id="social_facebook"
                      value={settings.social_facebook || ""}
                      onChange={(e) => handleChange('social_facebook', e.target.value || null)}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="social_twitter">Twitter URL (Optional)</Label>
                    <Input
                      id="social_twitter"
                      value={settings.social_twitter || ""}
                      onChange={(e) => handleChange('social_twitter', e.target.value || null)}
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="social_instagram">Instagram URL (Optional)</Label>
                    <Input
                      id="social_instagram"
                      value={settings.social_instagram || ""}
                      onChange={(e) => handleChange('social_instagram', e.target.value || null)}
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="social_linkedin">LinkedIn URL (Optional)</Label>
                    <Input
                      id="social_linkedin"
                      value={settings.social_linkedin || ""}
                      onChange={(e) => handleChange('social_linkedin', e.target.value || null)}
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Section Visibility</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_hero" className="cursor-pointer">Hero Section</Label>
                    <Switch
                      id="enable_hero"
                      checked={settings.enable_hero}
                      onCheckedChange={(checked) => handleChange('enable_hero', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_features" className="cursor-pointer">Features Section</Label>
                    <Switch
                      id="enable_features"
                      checked={settings.enable_features}
                      onCheckedChange={(checked) => handleChange('enable_features', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_testimonials" className="cursor-pointer">Testimonials Section</Label>
                    <Switch
                      id="enable_testimonials"
                      checked={settings.enable_testimonials}
                      onCheckedChange={(checked) => handleChange('enable_testimonials', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_stats" className="cursor-pointer">Statistics Section</Label>
                    <Switch
                      id="enable_stats"
                      checked={settings.enable_stats}
                      onCheckedChange={(checked) => handleChange('enable_stats', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_cta" className="cursor-pointer">Call to Action Section</Label>
                    <Switch
                      id="enable_cta"
                      checked={settings.enable_cta}
                      onCheckedChange={(checked) => handleChange('enable_cta', checked)}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">SEO Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea
                      id="meta_description"
                      value={settings.meta_description}
                      onChange={(e) => handleChange('meta_description', e.target.value)}
                      placeholder="Brief description for search engines (150-160 characters recommended)"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {settings.meta_description.length} / 160 characters
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="meta_keywords">Meta Keywords (Optional)</Label>
                    <Input
                      id="meta_keywords"
                      value={settings.meta_keywords || ""}
                      onChange={(e) => handleChange('meta_keywords', e.target.value || null)}
                      placeholder="cme, medical education, webinars (comma separated)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate keywords with commas
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-muted/40">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4" />
                  Preview URL
                </h4>
                <p className="text-sm text-muted-foreground">
                  View your landing page at:
                </p>
                <a 
                  href="/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
