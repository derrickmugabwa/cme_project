import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { processTeamsAttendanceFile, parseExcelOrCSV } from '@/lib/teams-attendance-parser';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API endpoint for uploading Teams attendance files
 * POST /api/attendance/upload
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check authorization (admin or faculty only)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionData.session.user.id)
      .single();
      
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    if (!['admin', 'faculty'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session ID provided' },
        { status: 400 }
      );
    }
    
    // Check if session exists
    const { data: sessionExists, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
      
    if (sessionError || !sessionExists) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // Create upload history record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('attendance_upload_history')
      .insert({
        session_id: sessionId,
        filename: file.name,
        uploaded_by: sessionData.session.user.id,
        status: 'processing',
        record_count: 0,
        success_count: 0,
        error_count: 0
      })
      .select()
      .single();
      
    if (uploadError) {
      console.error('Error creating upload history record:', uploadError);
      return NextResponse.json(
        { error: 'Failed to create upload history record' },
        { status: 500 }
      );
    }
    
    // Parse the file
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(fileBuffer);
    
    // Determine file type and parse accordingly
    const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
    const parsedData = await parseExcelOrCSV(fileContent, fileType);
    
    if (!parsedData || parsedData.length === 0) {
      // Update upload history record
      await supabase
        .from('attendance_upload_history')
        .update({
          status: 'failed',
          error_count: 1,
          notes: 'Failed to parse file or file is empty'
        })
        .eq('id', uploadRecord.id);
        
      return NextResponse.json(
        { error: 'Failed to parse file or file is empty' },
        { status: 400 }
      );
    }
    
    // Process the attendance data
    const result = await processTeamsAttendanceFile(
      supabase,
      parsedData,
      sessionId,
      sessionData.session.user.id
    );
    
    // Update upload history record
    await supabase
      .from('attendance_upload_history')
      .update({
        status: 'completed',
        record_count: result.totalRecords,
        success_count: result.successCount,
        error_count: result.errorCount,
        notes: result.errorCount > 0 ? 'Some records could not be processed' : null
      })
      .eq('id', uploadRecord.id);
    
    return NextResponse.json({
      message: 'File processed successfully',
      uploadId: uploadRecord.id,
      ...result
    });
  } catch (error: any) {
    console.error('Error processing attendance file:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to process attendance file' },
      { status: 500 }
    );
  }
}
