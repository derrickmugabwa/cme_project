"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Loader2, Image as ImageIcon, Check } from "lucide-react";
import Image from "next/image";

interface FaviconData {
  id: string;
  url: string;
  alt_text: string;
  updated_at: string;
}

interface FaviconManagerProps {
  initialFavicon?: FaviconData;
}

export function FaviconManager({ initialFavicon }: FaviconManagerProps) {
  const [favicon, setFavicon] = useState<FaviconData | undefined>(initialFavicon);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    setFavicon(initialFavicon);
    if (initialFavicon?.url) {
      setPreview(initialFavicon.url);
    }
  }, [initialFavicon]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (PNG, ICO, or SVG recommended)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 1MB for favicon)
      if (selectedFile.size > 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Favicon should be less than 1MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a favicon image to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;
      const filePath = `site/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      // Save to database
      if (favicon) {
        // Update existing favicon
        const { error } = await supabase
          .from('site_favicon')
          .update({
            url: publicUrl,
            alt_text: 'Site Favicon',
            updated_at: new Date().toISOString(),
          })
          .eq('id', favicon.id);

        if (error) throw error;
      } else {
        // Insert new favicon
        const { data, error } = await supabase
          .from('site_favicon')
          .insert({
            url: publicUrl,
            alt_text: 'Site Favicon',
          })
          .select()
          .single();

        if (error) throw error;
        setFavicon(data);
      }

      // Update the favicon in the document
      updateFaviconInDocument(publicUrl);

      toast({
        title: "Success",
        description: "Favicon uploaded successfully!",
      });

      setFile(null);
    } catch (error: any) {
      console.error('Error uploading favicon:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload favicon",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const updateFaviconInDocument = (url: string) => {
    // Update existing favicon link or create new one
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;

    // Also update apple-touch-icon
    let appleLink: HTMLLinkElement | null = document.querySelector("link[rel~='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = url;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Favicon</CardTitle>
        <CardDescription>
          Upload your site favicon. Recommended size: 32x32 or 64x64 pixels. Formats: ICO, PNG, or SVG.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Favicon Preview */}
        {preview && (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
            <div className="relative w-16 h-16 bg-white border rounded flex items-center justify-center">
              <Image
                src={preview}
                alt="Favicon preview"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Current Favicon</p>
              <p className="text-xs text-gray-500">
                {favicon ? 'Uploaded' : 'Preview'}
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="favicon-upload">Upload New Favicon</Label>
            <div className="mt-2">
              <Input
                id="favicon-upload"
                type="file"
                accept="image/*,.ico"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Accepted formats: ICO, PNG, SVG, JPG (Max size: 1MB)
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                {file.name} selected
              </span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full bg-[#008C45] hover:bg-[#006633] text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Favicon
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tips for best results:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Use a square image (32x32 or 64x64 pixels)</li>
                <li>ICO format provides best browser compatibility</li>
                <li>PNG with transparency works well for modern browsers</li>
                <li>The favicon will update immediately after upload</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
