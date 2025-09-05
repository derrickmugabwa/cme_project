"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileVideo, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { 
  SessionMedia, 
  MediaUploadProgress, 
  validateMediaFile, 
  formatFileSize,
  getFileTypeIcon 
} from '@/types/session-media';

interface MediaUploadZoneProps {
  sessionId?: string; // Optional for creation flow
  onFilesUploaded: (files: SessionMedia[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: MediaUploadProgress;
}

export default function MediaUploadZone({
  sessionId,
  onFilesUploaded,
  maxFiles = 10,
  disabled = false,
  className = ""
}: MediaUploadZoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    // Validate each file
    for (const file of acceptedFiles) {
      const validation = validateMediaFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }
    
    // Check total file count
    if (maxFiles && (uploadingFiles.length + validFiles.length) > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return;
    }
    
    // Show validation errors
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    // If no sessionId, create preview media objects
    if (!sessionId) {
      const previewMedia: SessionMedia[] = validFiles.map(file => ({
        id: `preview-${Date.now()}-${Math.random()}`,
        session_id: 'preview',
        file_name: file.name,
        file_type: file.type.startsWith('video/') ? 'video' : 'image',
        file_size: file.size,
        mime_type: file.type,
        storage_path: '',
        public_url: URL.createObjectURL(file),
        thumbnail_url: null,
        upload_status: 'completed',
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
        _file: file // Store original file for later upload
      }));
      
      onFilesUploaded(previewMedia);
      return;
    }
    
    // Start uploading files (existing upload logic)
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: {
        fileName: file.name,
        status: 'uploading',
        progress: 0
      }
    }));
    
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
    
    // Upload each file
    const uploadPromises = validFiles.map(async (file, index) => {
      try {
        const uploadedMedia = await uploadFile(file, sessionId);
        
        // Update progress to completed
        setUploadingFiles(prev => 
          prev.map(uf => 
            uf.file === file 
              ? { ...uf, progress: { ...uf.progress, status: 'completed', progress: 100 } }
              : uf
          )
        );
        
        return uploadedMedia;
      } catch (error) {
        // Update progress to failed
        setUploadingFiles(prev => 
          prev.map(uf => 
            uf.file === file 
              ? { 
                  ...uf, 
                  progress: { 
                    ...uf.progress,
                    status: 'failed', 
                    progress: 0, 
                    error: error instanceof Error ? error.message : 'Upload failed' 
                  } 
                }
              : uf
          )
        );
        
        console.error('Upload failed:', error);
        return null;
      }
    });
    
    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((result): result is SessionMedia => result !== null);
    
    // Notify parent component
    if (successfulUploads.length > 0) {
      onFilesUploaded(successfulUploads);
    }
    
    // Remove completed/failed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => 
        prev.filter(uf => uf.progress.status === 'uploading')
      );
    }, 3000);
  }, [disabled, maxFiles, uploadingFiles.length, sessionId, onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles,
    disabled
  });

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50'}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <FileVideo className="h-8 w-8 text-gray-400" />
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop files here' : 'Upload media files'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Drag & drop or click to select videos and images
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supported: MP4, MOV, AVI, WebM (videos) • JPEG, PNG, WebP, GIF (images)
                </p>
                <p className="text-xs text-gray-400">
                  Max size: 500MB for videos, 10MB for images
                </p>
              </div>
              
              <Button variant="outline" disabled={disabled}>
                Choose Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {getFileTypeIcon(uploadingFile.file.type)}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {uploadingFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadingFile.file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadingFile.progress.status === 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadingFile(uploadingFile.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {uploadingFile.progress.status === 'uploading' && (
                  <Progress value={uploadingFile.progress.progress} className="h-2" />
                )}
                
                {uploadingFile.progress.status === 'completed' && (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Upload completed
                  </div>
                )}
                
                {uploadingFile.progress.status === 'failed' && (
                  <div className="text-sm text-red-600">
                    ✗ Upload failed: {uploadingFile.progress.error}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to upload a single file
async function uploadFile(file: File, sessionId?: string): Promise<SessionMedia> {
  if (!sessionId) {
    throw new Error('Session ID is required for upload');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', file.type.startsWith('video/') ? 'video' : 'image');

  const response = await fetch(`/api/sessions/${sessionId}/media`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Upload failed');
  }

  const data = await response.json();
  return data.media;
}
