import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { getMediaFileType, validateMediaFile } from '@/types/session-media';

// GET /api/sessions/[id]/media - Get all media files for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get media files for the session
    const { data: media, error } = await supabase
      .from('session_media')
      .select('*')
      .eq('session_id', sessionId)
      .eq('upload_status', 'completed')
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ media: media || [] });
  } catch (error: unknown) {
    console.error('Error getting session media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get session media' },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[id]/media - Upload media files for a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Check user permissions (faculty or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['faculty', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized - Faculty or Admin role required' }, { status: 403 });
    }

    // Verify session exists and user has permission
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, created_by')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user can edit this session
    if (session.created_by !== user.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - You can only upload media to your own sessions' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    const displayOrder = parseInt(formData.get('displayOrder') as string) || 0;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = validateMediaFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: validation.error || 'Invalid file type'
      }, { status: 400 });
    }

    // Determine file type category
    const detectedFileType = getMediaFileType(file);
    const finalFileType = fileType === detectedFileType ? fileType : detectedFileType;

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    
    // Storage path: session-media/{user_id}/{session_id}/{filename}
    const storagePath = `session-media/${user.id}/${sessionId}/${uniqueFileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content')
      .getPublicUrl(storagePath);

    // Create database record
    const { data: mediaRecord, error: dbError } = await supabase
      .from('session_media')
      .insert({
        session_id: sessionId,
        file_name: sanitizedFileName,
        file_type: finalFileType,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        public_url: publicUrl,
        upload_status: 'completed',
        display_order: displayOrder,
        metadata: {
          original_name: file.name,
          uploaded_by: user.id,
          upload_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('content').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 });
    }

    return NextResponse.json({ 
      media: mediaRecord,
      message: 'File uploaded successfully' 
    });

  } catch (error: unknown) {
    console.error('Error uploading session media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload session media' },
      { status: 500 }
    );
  }
}
