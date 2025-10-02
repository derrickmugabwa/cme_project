"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { LogoManager } from "@/components/admin/site/navbar/logo-manager";
import { FaviconManager } from "@/components/admin/site/navbar/favicon-manager";
import { NavItemsManager, NavItem } from "@/components/admin/site/navbar/nav-items-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface LogoData {
  id: string;
  url: string;
  alt_text: string;
  updated_at: string;
}

export default function NavbarManagementPage() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [logo, setLogo] = useState<LogoData | undefined>(undefined);
  const [favicon, setFavicon] = useState<LogoData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch navigation items
        const { data: navData, error: navError } = await supabase
          .from('landing_navigation')
          .select('*')
          .order('order_index');
          
        if (navError) throw new Error(`Failed to fetch navigation items: ${navError.message}`);
        
        // Fetch logo data
        const { data: logoData, error: logoError } = await supabase
          .from('landing_logo')
          .select('*')
          .single();
          
        if (logoError && logoError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
          throw new Error(`Failed to fetch logo: ${logoError.message}`);
        }
        
        // Fetch favicon data
        const { data: faviconData, error: faviconError } = await supabase
          .from('site_favicon')
          .select('*')
          .single();
          
        if (faviconError && faviconError.code !== 'PGRST116') {
          throw new Error(`Failed to fetch favicon: ${faviconError.message}`);
        }
        
        setNavItems(navData || []);
        setLogo(logoData || undefined);
        setFavicon(faviconData || undefined);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [supabase]);

  const handleSaveNavItems = async (items: NavItem[]) => {
    try {
      // First delete all existing items
      const { error: deleteError } = await supabase
        .from('landing_navigation')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        
      if (deleteError) throw new Error(`Failed to update navigation: ${deleteError.message}`);
      
      // Then insert all new/updated items
      const { error: insertError } = await supabase
        .from('landing_navigation')
        .insert(items.map(item => ({
          ...item,
          // If it's a temporary ID (starts with 'temp-'), generate a new one on the server
          id: item.id.startsWith('temp-') ? undefined : item.id
        })));
        
      if (insertError) throw new Error(`Failed to update navigation: ${insertError.message}`);
      
      // Refresh the data
      const { data: refreshedData, error: refreshError } = await supabase
        .from('landing_navigation')
        .select('*')
        .order('order_index');
        
      if (refreshError) throw new Error(`Failed to refresh navigation data: ${refreshError.message}`);
      
      setNavItems(refreshedData || []);
      
      return Promise.resolve();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: "destructive",
      });
      return Promise.reject(err);
    }
  };

  const handleSaveLogo = async (logoData: { url: string; alt_text: string }) => {
    try {
      if (logo) {
        // Update existing logo
        const { error } = await supabase
          .from('landing_logo')
          .update({
            url: logoData.url,
            alt_text: logoData.alt_text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', logo.id);
          
        if (error) throw new Error(`Failed to update logo: ${error.message}`);
      } else {
        // Insert new logo
        const { error } = await supabase
          .from('landing_logo')
          .insert({
            url: logoData.url,
            alt_text: logoData.alt_text,
          });
          
        if (error) throw new Error(`Failed to create logo: ${error.message}`);
      }
      
      // Refresh the logo data
      const { data: refreshedData, error: refreshError } = await supabase
        .from('landing_logo')
        .select('*')
        .single();
        
      if (refreshError) throw new Error(`Failed to refresh logo data: ${refreshError.message}`);
      
      setLogo(refreshedData);
      
      return Promise.resolve();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: "destructive",
      });
      return Promise.reject(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading navigation settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Navigation Management</CardTitle>
          <CardDescription>
            Manage your site navigation and logo. Changes will be reflected on the landing page immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nav-items" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="nav-items">Navigation Items</TabsTrigger>
              <TabsTrigger value="logo">Logo</TabsTrigger>
              <TabsTrigger value="favicon">Favicon</TabsTrigger>
            </TabsList>
            
            <TabsContent value="nav-items" className="space-y-4">
              <NavItemsManager 
                initialItems={navItems} 
                onSave={handleSaveNavItems} 
              />
            </TabsContent>
            
            <TabsContent value="logo" className="space-y-4">
              <LogoManager 
                initialLogo={logo} 
                onSave={handleSaveLogo} 
              />
            </TabsContent>
            
            <TabsContent value="favicon" className="space-y-4">
              <FaviconManager 
                initialFavicon={favicon} 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
