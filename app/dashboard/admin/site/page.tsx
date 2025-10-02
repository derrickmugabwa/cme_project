"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Eye, FileText, Users, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SiteManagementPage() {
  const [lastUpdated, setLastUpdated] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchLastUpdates() {
      setIsLoading(true);
      
      try {
        // Get the latest update from each landing page table
        const tables = [
          'landing_hero',
          'landing_features',
          'landing_testimonials',
          'landing_stats',
          'landing_cta',
          'landing_settings',
          'footer_settings'
        ];
        
        const updates: {[key: string]: string} = {};
        
        for (const table of tables) {
          const { data, error } = await supabase
            .from(table)
            .select('updated_at')
            .order('updated_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.error(`Error fetching ${table}:`, error);
          } else if (data && data.length > 0) {
            updates[table] = new Date(data[0].updated_at).toLocaleString();
          }
        }
        
        setLastUpdated(updates);
      } catch (error) {
        console.error('Error fetching updates:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLastUpdates();
  }, [supabase]);
  
  const sections = [
    {
      title: "Hero Section",
      description: "Main banner and call-to-action",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/admin/site/hero",
      lastUpdate: lastUpdated['landing_hero'] || 'Not updated yet'
    },
    {
      title: "Features",
      description: "Platform features showcase",
      icon: <Video className="h-5 w-5" />,
      href: "/dashboard/admin/site/features",
      lastUpdate: lastUpdated['landing_features'] || 'Not updated yet'
    },
    {
      title: "Testimonials",
      description: "User testimonials and reviews",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/admin/site/testimonials",
      lastUpdate: lastUpdated['landing_testimonials'] || 'Not updated yet'
    },
    {
      title: "Statistics",
      description: "Platform usage statistics",
      icon: <Clock className="h-5 w-5" />,
      href: "/dashboard/admin/site/stats",
      lastUpdate: lastUpdated['landing_stats'] || 'Not updated yet'
    },
    {
      title: "Call to Action",
      description: "Bottom page call-to-action",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/admin/site/cta",
      lastUpdate: lastUpdated['landing_cta'] || 'Not updated yet'
    },
    {
      title: "Navigation",
      description: "Site navigation and links",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/admin/site/navbar",
      lastUpdate: lastUpdated['landing_settings'] || 'Not updated yet'
    },
    {
      title: "Footer",
      description: "Footer content and links",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/admin/site/footer",
      lastUpdate: lastUpdated['footer_settings'] || 'Not updated yet'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Landing Page Sections</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => window.open('/', '_blank')}
        >
          <Eye className="h-4 w-4" />
          Preview Site
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  {section.icon}
                </div>
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2 pt-0">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Last updated:</span> {section.lastUpdate}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="default" 
                className="w-full bg-[#008C45] hover:bg-[#006633] text-white"
                onClick={() => router.push(section.href)}
              >
                Edit Section
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              <li>Changes to the landing page content will be visible immediately to all users.</li>
              <li>Use the preview button to see how your changes look before making them live.</li>
              <li>Images should be optimized for web (recommended size: 1200x800px, max 500KB).</li>
              <li>For technical assistance with the site management, please contact the developer.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
