# Webinar Media Upload Implementation Plan

## Overview
This document outlines the implementation plan for adding video and photo upload functionality to the webinar creation process in the CME platform. This feature will allow faculty and admin users to upload promotional materials, session recordings, and visual content when creating webinars.

## Requirements

### Functional Requirements
1. **File Upload Support**
   - Support for video files (MP4, MOV, AVI, WebM)
   - Support for image files (JPEG, PNG, WebP, GIF)
   - Multiple file uploads per webinar
   - File size limits and validation
   - Progress indicators during upload

2. **Storage Management**
   - Secure file storage using Supabase Storage
   - Organized folder structure by webinar
   - File compression and optimization
   - CDN delivery for fast access

3. **User Interface**
   - Drag-and-drop upload interface
   - File preview functionality
   - Upload progress tracking
   - File management (delete, reorder)
   - Responsive design for all devices

4. **Security & Validation**
   - File type validation
   - File size restrictions
   - Malware scanning (future enhancement)
   - Access control and permissions

### Non-Functional Requirements
- Maximum file size: 500MB for videos, 10MB for images
- Supported formats: MP4, MOV, AVI, WebM (videos), JPEG, PNG, WebP, GIF (images)
- Upload timeout: 10 minutes for large files
- Storage quota management per user/organization

## Technical Architecture

### Database Schema Changes

#### New Tables

```sql
-- Session media files table
CREATE TABLE session_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'video' or 'image'
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Format: session-media/{user_id}/{session_id}/{filename}
    public_url TEXT,
    thumbnail_url TEXT, -- For videos and large images
    upload_status TEXT DEFAULT 'uploading', -- 'uploading', 'completed', 'failed'
    metadata JSONB, -- Duration, dimensions, etc.
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_session_media_session_id ON session_media(session_id);
CREATE INDEX idx_session_media_type ON session_media(file_type);
CREATE INDEX idx_session_media_status ON session_media(upload_status);

-- RLS Policies
ALTER TABLE session_media ENABLE ROW LEVEL SECURITY;

-- Users can view media for sessions they have access to
CREATE POLICY "Users can view session media" ON session_media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_media.session_id
            AND (
                s.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'faculty')
                )
            )
        )
    );

-- Only session creators and admins can insert/update/delete media
CREATE POLICY "Session creators and admins can manage media" ON session_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_media.session_id
            AND (
                s.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.role = 'admin'
                )
            )
        )
    );
```

#### Storage Configuration Updates

```sql
-- Update existing content bucket with file size and type restrictions
UPDATE storage.buckets 
SET 
    file_size_limit = 524288000, -- 500MB limit
    allowed_mime_types = ARRAY[
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ]
WHERE id = 'content';

-- Add storage policies for session media (using existing content bucket)
CREATE POLICY "Users can view session media files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'content' 
        AND (storage.foldername(name))[1] = 'session-media'
    );

CREATE POLICY "Faculty and admins can upload session media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'content'
        AND (storage.foldername(name))[1] = 'session-media'
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'faculty')
        )
    );

CREATE POLICY "Users can update their own session media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'content'
        AND (storage.foldername(name))[1] = 'session-media'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

CREATE POLICY "Users can delete their own session media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'content'
        AND (storage.foldername(name))[1] = 'session-media'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );
```

### API Endpoints

#### 1. File Upload Endpoint
```typescript
// app/api/sessions/[id]/media/route.ts
POST /api/sessions/[id]/media
- Handles multipart file uploads
- Validates file types and sizes
- Stores files in Supabase Storage
- Creates database records
- Returns upload progress and file metadata
```

#### 2. Media Management Endpoints
```typescript
// app/api/sessions/[id]/media/route.ts
GET /api/sessions/[id]/media
- Retrieves all media files for a session
- Returns file metadata and public URLs

// app/api/sessions/[id]/media/[mediaId]/route.ts
DELETE /api/sessions/[id]/media/[mediaId]
- Deletes media file from storage and database

PATCH /api/sessions/[id]/media/[mediaId]
- Updates media metadata (display order, etc.)
```

#### 3. Thumbnail Generation Endpoint
```typescript
// app/api/sessions/[id]/media/[mediaId]/thumbnail/route.ts
POST /api/sessions/[id]/media/[mediaId]/thumbnail
- Generates thumbnails for videos and large images
- Uses server-side processing or external service
```

### Frontend Components

#### 1. Media Upload Component
```typescript
// components/sessions/MediaUploadZone.tsx
interface MediaUploadZoneProps {
  sessionId?: string; // Optional for creation flow
  onFilesUploaded: (files: SessionMedia[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}
```

Features:
- Drag-and-drop interface
- File type validation
- Progress indicators
- Preview thumbnails
- Error handling

#### 2. Media Gallery Component
```typescript
// components/sessions/MediaGallery.tsx
interface MediaGalleryProps {
  sessionId: string;
  media: SessionMedia[];
  editable?: boolean;
  onMediaUpdate?: (media: SessionMedia[]) => void;
}
```

Features:
- Grid layout for media display
- Video player integration
- Image lightbox
- Drag-to-reorder functionality
- Delete and edit actions

#### 3. Media Manager Component
```typescript
// components/sessions/MediaManager.tsx
interface MediaManagerProps {
  sessionId?: string;
  initialMedia?: SessionMedia[];
  onChange: (media: SessionMedia[]) => void;
}
```

Features:
- Combines upload and gallery functionality
- Manages upload state
- Handles file operations
- Integrates with session creation form

#### 4. Session Media Viewer Component
```typescript
// components/sessions/SessionMediaViewer.tsx
interface SessionMediaViewerProps {
  sessionId: string;
  media: SessionMedia[];
  canEdit?: boolean;
  userRole?: string;
}
```

Features:
- **Simple Video Player**: Basic video playback for trailers and short videos
- **Image Gallery**: Grid layout for promotional images
- **Responsive Layout**: Adapts to different screen sizes
- **Clean Interface**: Minimal design focused on content viewing

#### 5. Simple Video Player Component
```typescript
// components/sessions/VideoPlayer.tsx
interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}
```

Features:
- **Basic Controls**: Play, pause, volume, fullscreen
- **Responsive Design**: Adapts to container size
- **Mobile Friendly**: Touch-optimized for mobile devices
- **Poster Image**: Thumbnail preview before play

#### 6. Simple Image Lightbox Component
```typescript
// components/sessions/ImageLightbox.tsx
interface ImageLightboxProps {
  images: SessionMedia[];
  initialIndex?: number;
  onClose: () => void;
}
```

Features:
- **Full-screen View**: Clean image display
- **Basic Navigation**: Previous/next arrows for multiple images
- **Close Button**: Easy exit from lightbox
- **Mobile Friendly**: Touch navigation and responsive design

### Integration Points

#### 1. Session Creation Form Updates
```typescript
// app/dashboard/sessions/create/page.tsx
// Add media upload section to the form
const [sessionMedia, setSessionMedia] = useState<SessionMedia[]>([]);

// Include media in session creation payload
const sessionData = {
  // ... existing fields
  media: sessionMedia
};
```

#### 2. Session Display Updates
```typescript
// app/dashboard/sessions/[id]/client.tsx
// Enhanced media viewing section in session details
<SessionMediaViewer 
  sessionId={session.id}
  media={session.media}
  canEdit={canEdit}
  userRole={currentUserRole}
/>
```

#### 3. Session Edit Form Updates
```typescript
// app/dashboard/sessions/[id]/edit/page.tsx
// Allow media management in edit mode
<MediaManager
  sessionId={session.id}
  initialMedia={session.media}
  onChange={handleMediaChange}
/>
```

### Session Details Page Integration

The session details page (`app/dashboard/sessions/[id]/client.tsx`) will be enhanced with a dedicated media viewing section that provides:

#### Media Section Layout
```typescript
// Added to WebinarDetailClient component after the main session card
{session.media && session.media.length > 0 && (
  <Card className="mt-6">
    <CardHeader>
      <CardTitle className="text-xl flex items-center gap-2">
        <PlayCircle className="h-5 w-5" />
        Session Media
        <Badge variant="secondary">{session.media.length}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <SessionMediaViewer 
        sessionId={session.id}
        media={session.media}
        canEdit={currentUserRole === 'admin' || session.created_by === authSession?.user?.id}
        userRole={currentUserRole}
      />
    </CardContent>
  </Card>
)}
```

#### Simple User Experience Features

1. **Basic Video Playback**
   - Standard HTML5 video player with native controls
   - Autoplay options for trailers
   - Responsive video sizing

2. **Simple Image Display**
   - Grid layout for multiple images
   - Click to view in lightbox
   - Basic navigation between images

3. **Mobile-Friendly Design**
   - Responsive layout for all screen sizes
   - Touch-friendly interface
   - Fast loading and minimal bandwidth usage

4. **Basic Accessibility**
   - Keyboard navigation support
   - Screen reader compatibility
   - Standard video controls

#### Media Types and Use Cases

1. **Short Videos**
   - Session trailers (30 seconds - 2 minutes)
   - Speaker introductions
   - Quick course previews

2. **Promotional Images**
   - Session banners and posters
   - Speaker photos
   - Course thumbnails
   - Event graphics

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Schema**
   - Create `session_media` table
   - Set up RLS policies
   - Create storage bucket and policies

2. **Basic API Endpoints**
   - File upload endpoint
   - Media retrieval endpoint
   - Basic validation and error handling

3. **Storage Integration**
   - Supabase Storage configuration
   - File naming conventions
   - Basic file operations

### Phase 2: Frontend Components (Week 2)
1. **Upload Component**
   - Drag-and-drop interface
   - File validation
   - Progress tracking
   - Error handling

2. **Simple Media Viewer Components**
   - SessionMediaViewer with basic grid layout
   - Simple VideoPlayer using HTML5 video element
   - Basic ImageLightbox for full-screen viewing
   - Responsive design implementation

3. **Integration with Session Details**
   - Add media section to session details page
   - Fetch and display session media
   - Role-based editing permissions
   - Mobile-optimized viewing experience

4. **Integration with Creation Form**
   - Add media section to webinar creation
   - Form state management
   - Validation integration

### Phase 3: Advanced Features (Week 3)
1. **Thumbnail Generation**
   - Video thumbnail extraction
   - Image resizing
   - Automatic optimization

2. **Enhanced UI/UX**
   - Lightbox for images
   - Video player integration
   - Drag-to-reorder functionality

3. **Performance Optimization**
   - Lazy loading
   - CDN integration
   - Compression

### Phase 4: Polish & Testing (Week 4)
1. **Error Handling**
   - Comprehensive error messages
   - Retry mechanisms
   - Fallback UI states

2. **Testing**
   - Unit tests for components
   - Integration tests for API
   - E2E testing for upload flow

3. **Documentation**
   - User guides
   - API documentation
   - Troubleshooting guides

## File Structure

```
components/
├── sessions/
│   ├── MediaUploadZone.tsx
│   ├── MediaGallery.tsx
│   ├── MediaManager.tsx
│   ├── SessionMediaViewer.tsx      # Simple media viewer for session details
│   ├── VideoPlayer.tsx             # Basic HTML5 video player
│   └── ImageLightbox.tsx           # Simple image lightbox viewer
├── ui/
│   ├── file-upload.tsx
│   ├── progress-bar.tsx
│   └── media-preview.tsx

app/api/sessions/
├── [id]/
│   └── media/
│       ├── route.ts
│       └── [mediaId]/
│           ├── route.ts
│           └── thumbnail/
│               └── route.ts

lib/
├── media-utils.ts
├── file-validation.ts
└── thumbnail-generator.ts

types/
└── session-media.ts

supabase/migrations/
└── 20250905_session_media_upload.sql
```

## Security Considerations

### File Validation
- MIME type verification
- File signature checking
- Size limit enforcement
- Malicious file detection

### Access Control
- RLS policies for database access
- Storage bucket permissions
- API endpoint authorization
- User role verification

### Data Protection
- Secure file storage
- Encrypted transmission
- Access logging
- Regular security audits

## Performance Considerations

### Upload Optimization
- Chunked file uploads for large files
- Resume capability for interrupted uploads
- Parallel upload processing
- Client-side compression

### Delivery Optimization
- CDN integration
- Image optimization
- Video streaming
- Lazy loading

### Storage Management
- Automatic cleanup of orphaned files
- Storage quota monitoring
- File archiving strategies
- Cost optimization

## Monitoring & Analytics

### Upload Metrics
- Upload success/failure rates
- Average upload times
- File size distributions
- Popular file types

### Usage Analytics
- Media view counts and completion rates
- Video watch time and engagement patterns
- Download statistics and popular content
- User interaction heatmaps
- Storage utilization and cost analysis
- Session media effectiveness metrics

### Error Tracking
- Upload failures
- Validation errors
- Storage issues
- Performance bottlenecks

## Future Enhancements

### Advanced Media Features
- Video transcoding and streaming
- Automatic subtitle generation
- Image AI analysis and tagging
- Media search functionality

### Integration Enhancements
- Social media sharing
- Email attachment integration
- External storage providers
- Bulk upload capabilities

### Analytics & Insights
- Media engagement analytics
- A/B testing for media effectiveness
- Recommendation engine
- Content performance metrics

## Migration Strategy

### Existing Sessions
- Gradual rollout to existing sessions
- Optional media addition
- Backward compatibility maintenance
- Data migration scripts

### User Training
- Feature announcement
- Tutorial creation
- Support documentation
- Feedback collection

## Success Metrics

### Technical Metrics
- Upload success rate > 99%
- Average upload time < 30 seconds for 100MB files
- Zero data loss incidents
- 99.9% uptime for media services

### User Experience Metrics
- User adoption rate > 70% within 3 months
- Average media per session > 2
- User satisfaction score > 4.5/5
- Support ticket reduction for media issues

## Conclusion

This implementation plan provides a comprehensive approach to adding media upload functionality to the webinar creation process. The phased approach ensures stable delivery while the robust architecture supports future enhancements and scalability requirements.

The integration with existing systems maintains consistency with the current platform while adding significant value for users creating and consuming webinar content.
