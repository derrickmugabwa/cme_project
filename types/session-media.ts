export interface SessionMedia {
  id: string;
  session_id: string;
  file_name: string;
  file_type: 'video' | 'image';
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url: string | null;
  thumbnail_url: string | null;
  upload_status: 'uploading' | 'completed' | 'failed';
  display_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  _file?: File; // Optional: Original file object for preview mode during session creation
}

export interface MediaUploadResponse {
  media: SessionMedia;
  message: string;
}

export interface MediaListResponse {
  media: SessionMedia[];
}

export interface MediaUploadProgress {
  mediaId?: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface MediaValidation {
  isValid: boolean;
  error?: string;
  fileType?: 'video' | 'image';
}

// Allowed file types
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm'
] as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
] as const;

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_IMAGE_TYPES
] as const;

// File size limits
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper functions
export function validateMediaFile(file: File): MediaValidation {
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: 'Invalid file type. Allowed types: MP4, MOV, AVI, WebM (videos), JPEG, PNG, WebP, GIF (images)'
    };
  }

  // Determine file type category
  const fileType = ALLOWED_VIDEO_TYPES.includes(file.type as any) ? 'video' : 'image';

  // Check file size
  const maxSize = fileType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File too large. Maximum size for ${fileType}s is ${maxSizeMB}MB`
    };
  }

  return {
    isValid: true,
    fileType
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileTypeIcon(mimeType: string): string {
  if (ALLOWED_VIDEO_TYPES.includes(mimeType as any)) {
    return '🎥';
  }
  if (ALLOWED_IMAGE_TYPES.includes(mimeType as any)) {
    return '🖼️';
  }
  return '📄';
}

export function isVideoFile(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType as any);
}

export function isImageFile(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as any);
}
