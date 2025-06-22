"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/client';

export default function UploadCertificateBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload",
        variant: "destructive"
      });
      return;
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('content')
        .upload(`certificates/background-image/certificate-background.png`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Background uploaded successfully",
        description: "The certificate background image has been updated",
        variant: "default"
      });

      // Redirect back to certificates page after successful upload
      router.push('/dashboard/admin/certificates');
    } catch (error) {
      console.error('Error uploading background:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading the background image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Certificate Background</CardTitle>
          <CardDescription>
            Upload a new background image for certificates. The image should be in landscape orientation
            with dimensions of 297mm × 210mm (A4 size) and in PNG format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="background-image">Background Image</Label>
              <Input
                id="background-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Recommended: PNG image with transparent background, 3508 × 2480 pixels (300 DPI)
              </p>
            </div>

            {file && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Preview:</h3>
                <div className="border rounded-md overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Certificate Background Preview"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/admin/certificates')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Background"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
