import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/server';

// DELETE /api/sessions/[id]/media/[mediaId] - Delete a media file
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { id: sessionId, mediaId } = await params;

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Check user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['faculty', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized - Faculty or Admin role required' }, { status: 403 });
    }

    const { data: session, error: sessionError } = await adminSupabase
      .from('sessions')
      .select('id, created_by')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get media record to verify ownership and get storage path
    const { data: media, error: mediaError } = await adminSupabase
      .from('session_media')
      .select('*')
      .eq('id', mediaId)
      .eq('session_id', sessionId)
      .single();

    if (mediaError || !media) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    // Check if user can delete this media
    if (session.created_by !== user.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - You can only delete media from your own sessions' }, { status: 403 });
    }

    // Delete from storage
    const { error: storageError } = await adminSupabase.storage
      .from('content')
      .remove([media.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await adminSupabase
      .from('session_media')
      .delete()
      .eq('id', mediaId);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json({ error: dbError.message || 'Failed to delete media record' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Media file deleted successfully' });

  } catch (error: unknown) {
    console.error('Error deleting session media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete media' },
      { status: 500 }
    );
  }
}

// PATCH /api/sessions/[id]/media/[mediaId] - Update media metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: sessionId, mediaId } = await params;

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Check user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['faculty', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized - Faculty or Admin role required' }, { status: 403 });
    }

    // Verify media exists and user has permission
    const { data: media, error: mediaError } = await supabase
      .from('session_media')
      .select(`
        *,
        sessions!inner(created_by)
      `)
      .eq('id', mediaId)
      .eq('session_id', sessionId)
      .single();

    if (mediaError || !media) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 });
    }

    // Check if user can update this media
    if (media.sessions.created_by !== user.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - You can only update media from your own sessions' }, { status: 403 });
    }

    // Parse request body
    const updateData = await request.json() as Record<string, unknown>;
    const allowedFields = ['display_order', 'file_name'];
    
    // Filter to only allowed fields
    const filteredData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update media record
    const { data: updatedMedia, error: updateError } = await supabase
      .from('session_media')
      .update(filteredData)
      .eq('id', mediaId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update media record' }, { status: 500 });
    }

    return NextResponse.json({ 
      media: updatedMedia,
      message: 'Media updated successfully' 
    });

  } catch (error: unknown) {
    console.error('Error updating session media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update media' },
      { status: 500 }
    );
  }
}
