"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Eye } from 'lucide-react';
import MediaUploadZone from './MediaUploadZone';
import SessionMediaViewer from './SessionMediaViewer';
import { SessionMedia } from '@/types/session-media';

interface MediaManagerProps {
  sessionId?: string;
  initialMedia?: SessionMedia[];
  onChange: (media: SessionMedia[]) => void;
  canEdit?: boolean;
  userRole?: string;
}

export default function MediaManager({
  sessionId,
  initialMedia = [],
  onChange,
  canEdit = true,
  userRole
}: MediaManagerProps) {
  const [media, setMedia] = useState<SessionMedia[]>(initialMedia);
  const [activeTab, setActiveTab] = useState<string>(media.length > 0 ? 'view' : 'upload');

  const handleFilesUploaded = (newFiles: SessionMedia[]) => {
    const updatedMedia = [...media, ...newFiles];
    setMedia(updatedMedia);
    onChange(updatedMedia);
    
    // Switch to view tab after successful upload
    if (newFiles.length > 0) {
      setActiveTab('view');
    }
  };

  const handleMediaUpdate = (updatedMedia: SessionMedia[]) => {
    setMedia(updatedMedia);
    onChange(updatedMedia);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Session Media
          {media.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({media.length} file{media.length !== 1 ? 's' : ''})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View ({media.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            {canEdit ? (
              <MediaUploadZone
                sessionId={sessionId}
                onFilesUploaded={handleFilesUploaded}
                maxFiles={20}
                disabled={!sessionId}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>You don't have permission to upload media to this session.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="view" className="mt-4">
            <SessionMediaViewer
              sessionId={sessionId || ''}
              media={media}
              canEdit={canEdit}
              userRole={userRole}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
