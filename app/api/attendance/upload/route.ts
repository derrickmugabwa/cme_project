import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/server';
import { processTeamsAttendanceFile as processTeamsData } from '@/lib/teams-attendance-processor';
import { parseExcelOrCSV, processTeamsAttendanceFile as parseTeamsFile } from '@/lib/teams-attendance-parser';

/**
 * Detect file encoding based on BOM (Byte Order Mark) or content analysis
 */
function detectFileEncoding(buffer: Buffer): BufferEncoding {
  // Check for UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8';
  }
  
  // Check for UTF-16LE BOM
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le';
  }
  
  // Check for UTF-16BE BOM
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf16be';
  }
  
  // Default to UTF-8
  return 'utf8';
}

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
    const supabase = await createClient();
    // Create admin client to bypass RLS policies for attendance processing
    const adminSupabase = createAdminClient();
    
    // Get user session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check authorization (admin or faculty only)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
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
    
    // Create upload history record using admin client to bypass RLS policies
    const { data: uploadRecord, error: uploadError } = await adminSupabase
      .from('attendance_upload_history')
      .insert({
        session_id: sessionId,
        filename: file.name,
        uploaded_by: user.id,
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
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Determine file type and parse accordingly
    const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
    console.log(`Processing ${fileType} file for session ${sessionId}: ${file.name}`);
    
    try {
      // Parse the file based on type
      let attendanceData;
      
      // Parse the file data based on detected encoding
      const encoding = detectFileEncoding(fileBuffer);
      console.log(`Detected file encoding: ${encoding}`);
      
      // Parse the raw data
      const rawData = parseExcelOrCSV(fileBuffer);
      
      // Log raw data sample for debugging
      if (rawData.length > 0) {
        console.log(`Raw data parsed: ${rawData.length} rows`);
        console.log('First few rows:', JSON.stringify(rawData.slice(0, 3)));
      } else {
        console.error('No data rows found in the file');
      }
      
      // Process the raw data into structured attendance data
      attendanceData = parseTeamsFile(rawData);
      
      // Debug log for meeting info
      console.log('Meeting info from CSV:', attendanceData.meetingInfo ? {
        title: attendanceData.meetingInfo.title,
        startTime: attendanceData.meetingInfo.startTime,
        endTime: attendanceData.meetingInfo.endTime,
        durationMinutes: attendanceData.meetingInfo.durationMinutes,
        calculatedDuration: attendanceData.meetingInfo.startTime && attendanceData.meetingInfo.endTime ? 
          Math.round((new Date(attendanceData.meetingInfo.endTime).getTime() - new Date(attendanceData.meetingInfo.startTime).getTime()) / (1000 * 60)) : 'N/A'
      } : 'No meeting info found');
      
      // Check if we have valid attendance data
      if (!attendanceData || !attendanceData.participants || attendanceData.participants.length === 0) {
        console.error('Failed to parse file or file is empty');
        
        // Update upload history to failed
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
      
      console.log(`Parsed attendance data: ${attendanceData.participants.length} participants found`);
      
      // Process the attendance data using admin client to bypass RLS policies
      const result = await processTeamsData(
        adminSupabase, // Use admin client to bypass RLS policies
        attendanceData, // This is already the parsed TeamsAttendanceData object
        sessionId,
        user.id,
        rawData // Pass the raw data for UPN extraction
      );
      
      // Update upload history status with detailed results using admin client
      await adminSupabase
        .from('attendance_upload_history')
        .update({ 
          status: 'completed', 
          record_count: result.totalRecords,
          success_count: result.successCount,
          error_count: result.errorCount,
          error_message: result.errorCount > 0 ? 
            `${result.errorCount} participants could not be matched to user profiles` : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', uploadRecord.id);
      
      console.log(`Upload ${uploadRecord.id} completed: ${result.successCount}/${result.totalRecords} records processed successfully`);
      
      return NextResponse.json({
        message: 'File processed successfully',
        uploadId: uploadRecord.id,
        ...result
      });
    } catch (error: any) {
      console.error('Error processing attendance file:', error);
      
      // Update upload history to failed
      await supabase
        .from('attendance_upload_history')
        .update({
          status: 'failed',
          error_count: 1,
          notes: error instanceof Error ? error.message : String(error)
        })
        .eq('id', uploadRecord.id);
        
      return NextResponse.json(
        { error: 'Failed to process attendance file: ' + (error instanceof Error ? error.message : String(error)) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error processing attendance file:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to process attendance file' },
      { status: 500 }
    );
  }
}
