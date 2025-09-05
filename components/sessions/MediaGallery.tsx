"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Image as ImageIcon, Trash2, Eye } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import ImageLightbox from './ImageLightbox';
import { SessionMedia, formatFileSize, isVideoFile, isImageFile } from '@/types/session-media';

interface MediaGalleryProps {
  sessionId: string;
  media: SessionMedia[];
  editable?: boolean;
  onMediaDeleted?: (mediaId: string) => void;
}

export default function MediaGallery({
  sessionId,
  media,
  editable = false,
  onMediaDeleted
}: MediaGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<SessionMedia | null>(null);
  const [lightboxImages, setLightboxImages] = useState<SessionMedia[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteMedia = async (mediaId: string) => {
    if (!editable) return;

    try {
      setDeleting(mediaId);
      
      const response = await fetch(`/api/sessions/${sessionId}/media/${mediaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete media');
      }

      onMediaDeleted?.(mediaId);
      
      // Close video player if this was the selected video
      if (selectedVideo?.id === mediaId) {
        setSelectedVideo(null);
      }
      
    } catch (error: any) {
      console.error('Error deleting media:', error);
    } finally {
      setDeleting(null);
    }
  };

  const openImageLightbox = (imageMedia: SessionMedia) => {
    const images = media.filter(m => isImageFile(m.mime_type));
    const index = images.findIndex(img => img.id === imageMedia.id);
    setLightboxImages(images);
    setLightboxIndex(index >= 0 ? index : 0);
  };

  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  // Separate videos and images
  const videos = media.filter(m => isVideoFile(m.mime_type));
  const images = media.filter(m => isImageFile(m.mime_type));

  if (media.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <ImageIcon className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">No media files available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Videos */}
      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Play className="h-4 w-4" />
            <h4 className="font-medium text-gray-900">Videos</h4>
            <Badge variant="secondary">{videos.length}</Badge>
          </div>

          {/* Video Player */}
          {selectedVideo && (
            <div className="mb-6">
              <VideoPlayer
                src={selectedVideo.public_url || ''}
                title={selectedVideo.file_name}
                className="mb-2"
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedVideo.file_size)}
                  </p>
                </div>
                {editable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteMedia(selectedVideo.id)}
                    disabled={deleting === selectedVideo.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deleting === selectedVideo.id ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Card 
                key={video.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedVideo?.id === video.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedVideo(video)}
              >
                <CardContent className="p-3">
                  <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center mb-2">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium truncate">{video.file_name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(video.file_size)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-4 w-4" />
            <h4 className="font-medium text-gray-900">Images</h4>
            <Badge variant="secondary">{images.length}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="group relative overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square relative">
                    <img
                      src={image.public_url || ''}
                      alt={image.file_name}
                      className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => openImageLightbox(image)}
                    />
                    
                    {editable && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMedia(image.id);
                          }}
                          disabled={deleting === image.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openImageLightbox(image)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{image.file_name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(image.file_size)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
