export interface SessionMedia {
  id: string;
  session_id: string;
  file_name: string;
  file_type: 'video' | 'image' | 'document';
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url: string | null;
  thumbnail_url: string | null;
  upload_status: 'uploading' | 'completed' | 'failed';
  display_order: number;
  metadata: Record<string, unknown>;
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
  fileType?: 'video' | 'image' | 'document';
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

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES
] as const;

// File size limits
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

// Helper functions
export function validateMediaFile(file: File): MediaValidation {
  // Check file type
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Allowed types: MP4, MOV, AVI, WebM (videos), JPEG, PNG, WebP, GIF (images), PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX (documents)'
    };
  }

  // Determine file type category
  const fileType = getMediaFileType(file);

  // Check file size
  const maxSize = fileType === 'video'
    ? MAX_VIDEO_SIZE
    : fileType === 'image'
      ? MAX_IMAGE_SIZE
      : MAX_DOCUMENT_SIZE;
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
  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)) {
    return '🎥';
  }
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return '🖼️';
  }
  return '📄';
}

export function isVideoFile(mimeType: string): boolean {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType);
}

export function isImageFile(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function isDocumentFile(mimeType: string): boolean {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType);
}

export function getMediaFileType(file: File): 'video' | 'image' | 'document' {
  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) return 'video';
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'image';
  return 'document';
}

export function getDocumentTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'PowerPoint';
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Word';
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Spreadsheet';
    default:
      return 'Document';
  }
}
