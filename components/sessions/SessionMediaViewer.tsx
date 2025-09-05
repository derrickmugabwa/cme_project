"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Image as ImageIcon, Trash2, AlertCircle, Upload, FileVideo, Clock, Eye } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import ImageLightbox from './ImageLightbox';
import { SessionMedia, formatFileSize, isVideoFile, isImageFile } from '@/types/session-media';

interface SessionMediaViewerProps {
  sessionId: string;
  media?: SessionMedia[];
  canEdit?: boolean;
  userRole?: string;
}

export default function SessionMediaViewer({
  sessionId,
  media: initialMedia,
  canEdit = false,
  userRole
}: SessionMediaViewerProps) {
  const [media, setMedia] = useState<SessionMedia[]>(initialMedia || []);
  const [loading, setLoading] = useState(!initialMedia);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<SessionMedia | null>(null);
  const [lightboxImages, setLightboxImages] = useState<SessionMedia[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch media if not provided
  useEffect(() => {
    if (!initialMedia) {
      fetchMedia();
    }
  }, [sessionId, initialMedia]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sessions/${sessionId}/media`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch media');
      }

      const data = await response.json();
      setMedia(data.media || []);
    } catch (error: any) {
      console.error('Error fetching media:', error);
      setError(error.message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!canEdit) return;

    try {
      setDeleting(mediaId);
      
      const response = await fetch(`/api/sessions/${sessionId}/media/${mediaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete media');
      }

      // Remove from local state
      setMedia(prev => prev.filter(m => m.id !== mediaId));
      
      // Close video player if this was the selected video
      if (selectedVideo?.id === mediaId) {
        setSelectedVideo(null);
      }
      
    } catch (error: any) {
      console.error('Error deleting media:', error);
      setError(error.message || 'Failed to delete media');
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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for videos section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="aspect-video bg-gray-200 rounded-md animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Skeleton for images section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gray-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-200 rounded-full flex items-center justify-center">
            <FileVideo className="h-4 w-4 text-purple-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Media Files Yet</h3>
        <p className="text-gray-500 mb-4 max-w-sm mx-auto">
          This session doesn't have any videos or images uploaded yet. Media files help attendees preview and understand the session content.
        </p>
        {canEdit && (
          <div className="text-sm text-gray-400">
            <p>You can add media files when editing this session.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Videos Section */}
      {videos.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-pink-200 rounded-lg flex items-center justify-center">
                <FileVideo className="h-4 w-4 text-red-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Videos</h4>
              <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                {videos.length}
              </Badge>
            </div>
            {selectedVideo && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                Now Playing
              </div>
            )}
          </div>

          {/* Selected Video Player */}
          {selectedVideo && (
            <Card className="overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-blue-200">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-900 mb-1">{selectedVideo.file_name}</h5>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatFileSize(selectedVideo.file_size)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedVideo.mime_type}
                    </Badge>
                  </div>
                </div>
                <VideoPlayer
                  src={selectedVideo.public_url || ''}
                  poster={selectedVideo.thumbnail_url || undefined}
                  className="mb-4 rounded-lg overflow-hidden shadow-sm"
                />
                {canEdit && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMedia(selectedVideo.id)}
                      disabled={deleting === selectedVideo.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deleting === selectedVideo.id ? 'Deleting...' : 'Delete Video'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Video Thumbnails Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Card 
                key={video.id} 
                className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                  selectedVideo?.id === video.id 
                    ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedVideo(video)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                          <Play className="h-6 w-6 text-gray-600 ml-0.5" />
                        </div>
                      </div>
                    )}
                    
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/0 group-hover:bg-white/90 rounded-full flex items-center justify-center transition-all duration-200 scale-75 group-hover:scale-100">
                        <Play className="h-6 w-6 text-transparent group-hover:text-gray-800 ml-0.5 transition-colors duration-200" />
                      </div>
                    </div>
                    
                    {/* Selected indicator */}
                    {selectedVideo?.id === video.id && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-blue-600 text-white text-xs">
                          Playing
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {video.file_name}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(video.file_size)}</span>
                      <Badge variant="outline" className="text-xs">
                        Video
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Images Section */}
      {images.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Images</h4>
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              {images.length}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((image) => (
              <Card 
                key={image.id} 
                className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                onClick={() => openImageLightbox(image)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                    <img
                      src={image.public_url || ''}
                      alt={image.file_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/0 group-hover:bg-white/90 rounded-full flex items-center justify-center transition-all duration-200 scale-75 group-hover:scale-100">
                        <Eye className="h-6 w-6 text-transparent group-hover:text-gray-800 transition-colors duration-200" />
                      </div>
                    </div>
                    
                    {/* Delete button */}
                    {canEdit && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMedia(image.id);
                          }}
                          disabled={deleting === image.id}
                          className="w-8 h-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Image type badge */}
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs">
                        Image
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {image.file_name}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(image.file_size)}</span>
                      <Badge variant="outline" className="text-xs">
                        {image.mime_type.split('/')[1]?.toUpperCase()}
                      </Badge>
                    </div>
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
