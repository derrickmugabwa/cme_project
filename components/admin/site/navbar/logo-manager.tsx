"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";

interface LogoData {
  id: string;
  url: string;
  alt_text: string;
  updated_at: string;
}

interface LogoManagerProps {
  initialLogo?: LogoData;
  onSave: (logoData: { url: string; alt_text: string }) => Promise<void>;
}

export function LogoManager({ initialLogo, onSave }: LogoManagerProps) {
  const [logo, setLogo] = useState<LogoData | undefined>(initialLogo);
  const [logoUrl, setLogoUrl] = useState<string>(initialLogo?.url || "");
  const [altText, setAltText] = useState<string>(initialLogo?.alt_text || "CME Platform Logo");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogo?.url || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview URL for immediate feedback
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload the file to Supabase storage
    setIsUploading(true);
    try {
      const supabase = createClient();
      
      // Generate a unique file name to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `site-assets/${fileName}`;
      
      // Upload to the 'content' bucket in the 'site-assets' folder
      const { data, error } = await supabase.storage
        .from('content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(filePath);
      
      setLogoUrl(publicUrl);
      toast({
        title: "Logo uploaded",
        description: "The logo has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading the logo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!logoUrl) {
      toast({
        title: "Missing logo",
        description: "Please upload a logo image.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ url: logoUrl, alt_text: altText });
      toast({
        title: "Logo saved",
        description: "The logo has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "There was an error saving the logo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl(null);
    setLogoUrl("");
    toast({
      title: "Logo removed",
      description: "The logo has been removed. Save changes to confirm.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo Management</CardTitle>
        <CardDescription>
          Upload and manage your site logo. Recommended size: 200x50px.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="logo-preview">Current Logo</Label>
          <div className="border rounded-md p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900 h-40">
            {previewUrl ? (
              <div className="relative">
                <Image
                  src={previewUrl}
                  alt={altText}
                  width={200}
                  height={50}
                  className="object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-gray-400 text-center">
                <p>No logo uploaded</p>
                <p className="text-xs">Upload a logo below</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-upload">Upload New Logo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && <div className="animate-spin">⌛</div>}
          </div>
          <p className="text-xs text-gray-500">
            Accepted formats: PNG, JPG, SVG. Max size: 2MB.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alt-text">Alt Text</Label>
          <Input
            id="alt-text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe your logo for accessibility"
          />
          <p className="text-xs text-gray-500">
            This text will be used by screen readers to describe your logo.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || isUploading}>
          {isSaving ? "Saving..." : "Save Logo"}
        </Button>
      </CardFooter>
    </Card>
  );
}
