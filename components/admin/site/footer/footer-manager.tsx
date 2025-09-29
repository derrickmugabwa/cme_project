"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FooterSectionsManager } from "./footer-sections-manager";
import { FooterLinksManager } from "./footer-links-manager";
import { Loader2, Save, Settings, Link as LinkIcon, Layout } from "lucide-react";

interface FooterSettings {
  id: string;
  footer_text: string | null;
  copyright_text: string | null;
  show_social_links: boolean;
  show_legal_links: boolean;
}

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

export function FooterManager() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch footer settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('footer_settings')
        .select('*')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch footer settings: ${settingsError.message}`);
      }

      // Fetch footer sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('footer_sections')
        .select('*')
        .order('order_index');

      if (sectionsError) {
        throw new Error(`Failed to fetch footer sections: ${sectionsError.message}`);
      }

      // Fetch footer links
      const { data: linksData, error: linksError } = await supabase
        .from('footer_links')
        .select('*')
        .order('section_id, order_index');

      if (linksError) {
        throw new Error(`Failed to fetch footer links: ${linksError.message}`);
      }

      setSettings(settingsData);
      setSections(sectionsData || []);
      setLinks(linksData || []);
    } catch (error) {
      console.error('Error fetching footer data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load footer data',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = (field: keyof FooterSettings, value: string | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: value
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('footer_settings')
        .upsert({
          id: settings.id,
          footer_text: settings.footer_text,
          copyright_text: settings.copyright_text,
          show_social_links: settings.show_social_links,
          show_legal_links: settings.show_legal_links,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Footer settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving footer settings:', error);
      toast({
        title: "Error",
        description: "Failed to save footer settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionsUpdate = (updatedSections: FooterSection[]) => {
    setSections(updatedSections);
  };

  const handleLinksUpdate = (updatedLinks: FooterLink[]) => {
    setLinks(updatedLinks);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading footer settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Footer Management
          </CardTitle>
          <CardDescription>
            Manage your website footer content, links, and settings. Changes will be reflected on the landing page immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="sections" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Sections
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Links
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Footer Settings</CardTitle>
                  <CardDescription>
                    Configure general footer appearance and content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="footer_text">Footer Description</Label>
                    <Textarea
                      id="footer_text"
                      value={settings?.footer_text || ""}
                      onChange={(e) => handleSettingsChange('footer_text', e.target.value)}
                      placeholder="Brief description about your organization"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="copyright_text">Copyright Text</Label>
                    <Input
                      id="copyright_text"
                      value={settings?.copyright_text || ""}
                      onChange={(e) => handleSettingsChange('copyright_text', e.target.value)}
                      placeholder="All rights reserved."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_social_links" className="cursor-pointer">
                        Show Social Media Links
                      </Label>
                      <Switch
                        id="show_social_links"
                        checked={settings?.show_social_links || false}
                        onCheckedChange={(checked) => handleSettingsChange('show_social_links', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_legal_links" className="cursor-pointer">
                        Show Legal Links in Bottom Bar
                      </Label>
                      <Switch
                        id="show_legal_links"
                        checked={settings?.show_legal_links || false}
                        onCheckedChange={(checked) => handleSettingsChange('show_legal_links', checked)}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sections" className="space-y-4">
              <FooterSectionsManager 
                sections={sections}
                onUpdate={handleSectionsUpdate}
              />
            </TabsContent>

            <TabsContent value="links" className="space-y-4">
              <FooterLinksManager 
                sections={sections}
                links={links}
                onUpdate={handleLinksUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
