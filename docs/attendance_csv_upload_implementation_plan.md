# Attendance Management Enhancement Plan: Teams CSV Upload Feature

## Overview

This document outlines the plan to enhance the attendance management system by implementing a feature that allows administrators to upload attendance data from Microsoft Teams meetings via CSV/Excel files. This approach addresses the limitation of not being able to automatically track attendance through direct Teams integration.

## Current System Analysis

The current attendance tracking system:
1. Records attendance when users click "Join Meeting"
2. Requires admin approval for each attendance record
3. Stores basic attendance data (check-in time, status, etc.)
4. Lacks duration tracking and minimum attendance requirements

## Enhancement Goals

1. Allow admins to upload Teams attendance CSV/Excel files
2. Track attendance duration for each participant
3. Set minimum duration requirements for certificate eligibility
4. Automate the approval process based on duration thresholds
5. Maintain compatibility with the existing attendance system

## Database Schema Updates

### Phase 1: Database Schema Migrations

#### 1. Update Session Attendance Table

```sql
-- Migration: 20250601_update_session_attendance_for_teams_csv.sql

-- Add new columns to session_attendance table
ALTER TABLE public.session_attendance
  ADD COLUMN join_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN leave_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN duration_minutes INTEGER,
  ADD COLUMN is_eligible_for_certificate BOOLEAN DEFAULT FALSE,
  ADD COLUMN attendance_source TEXT DEFAULT 'manual' CHECK (attendance_source IN ('manual', 'teams_csv'));

-- Update existing records to set join_time = check_in_time for consistency
UPDATE public.session_attendance
SET join_time = check_in_time
WHERE join_time IS NULL;

-- Create index for performance
CREATE INDEX idx_session_attendance_eligibility ON public.session_attendance(is_eligible_for_certificate);
CREATE INDEX idx_session_attendance_duration ON public.session_attendance(duration_minutes);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view their own attendance records" ON public.session_attendance;
CREATE POLICY "Users can view their own attendance records"
  ON public.session_attendance
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and faculty can view all attendance records" ON public.session_attendance;
CREATE POLICY "Admins and faculty can view all attendance records"
  ON public.session_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

DROP POLICY IF EXISTS "Admins and faculty can update attendance records" ON public.session_attendance;
CREATE POLICY "Admins and faculty can update attendance records"
  ON public.session_attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );
```

#### 2. Create Session Settings Table

```sql
-- Migration: 20250602_create_session_settings.sql

-- Create session_settings table
CREATE TABLE public.session_settings (
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  min_attendance_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (session_id)
);

-- Enable RLS
ALTER TABLE public.session_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view session settings"
  ON public.session_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and faculty can update session settings"
  ON public.session_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );
```

-- Policy for admins/faculty to manage session settings
CREATE POLICY "Admins and faculty can manage session settings"
  ON session_settings
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- Policy for users to view session settings
CREATE POLICY "Users can view session settings"
  ON session_settings
  FOR SELECT
  USING (true);

#### 3. Create Attendance Upload History Table

```sql
-- Migration: 20250603_create_attendance_upload_history.sql

-- Create attendance_upload_history table
CREATE TABLE public.attendance_upload_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  filename TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_upload_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and faculty can view upload history"
  ON public.attendance_upload_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'faculty')
    )
  );

CREATE POLICY "Users can insert their own upload records"
  ON public.attendance_upload_history
  FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Create indexes for performance
CREATE INDEX idx_attendance_upload_history_session ON public.attendance_upload_history(session_id);
CREATE INDEX idx_attendance_upload_history_uploader ON public.attendance_upload_history(uploaded_by);
CREATE INDEX idx_attendance_upload_history_status ON public.attendance_upload_history(status);
```

#### 4. Add Helper Functions for Teams Attendance Processing

```sql
-- Migration: 20250604_create_attendance_helper_functions.sql

-- Function to calculate eligibility based on duration and session settings
CREATE OR REPLACE FUNCTION public.check_attendance_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  min_minutes INTEGER;
BEGIN
  -- Get minimum minutes from session settings or use default
  SELECT COALESCE(
    (SELECT min_attendance_minutes FROM public.session_settings WHERE session_id = NEW.session_id),
    30 -- Default to 30 minutes if no settings found
  ) INTO min_minutes;
  
  -- Set eligibility based on duration
  IF NEW.duration_minutes >= min_minutes THEN
    NEW.is_eligible_for_certificate := TRUE;
  ELSE
    NEW.is_eligible_for_certificate := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update eligibility when duration changes
DROP TRIGGER IF EXISTS trg_check_attendance_eligibility ON public.session_attendance;
CREATE TRIGGER trg_check_attendance_eligibility
  BEFORE INSERT OR UPDATE OF duration_minutes
  ON public.session_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_attendance_eligibility();
```

## Teams CSV/Excel Format Analysis

Based on the sample provided, Microsoft Teams attendance reports have a specific structure:

1. **Summary Section** (First 8-10 rows):
   - Meeting title
   - Attended participants count
   - Start time (MM/DD/YY, H:MM:SS PM format)
   - End time (MM/DD/YY, H:MM:SS PM format)
   - Meeting duration (HHh MMm format)
   - Average attendance time

2. **Participants Section** (Begins after "Participants" header):
   - Name
   - First Join time
   - Last Leave time
   - In-Meeting Duration (HHm SSs format)
   - Email (primary identifier for matching users)
   - Participant ID (UPN)
   - Role (Organiser, Presenter)

3. **In-Meeting Activities Section** (Begins after "In-Meeting Activities" header):
   - Detailed log of each join/leave event
   - Name
   - Join Time
   - Leave Time
   - Duration
   - Email
   - Role

4. **Processing Challenges**:
   - Multiple sections with different formats in the same file
   - Need to skip summary rows and identify data section headers
   - Multiple join/leave entries for the same participant
   - Time format parsing (MM/DD/YY, H:MM:SS PM)
   - Duration format parsing (HHm SSs)

## Implementation Plan

### Phase 1: Database Schema Updates

1. Apply the database schema changes outlined above
2. Create database functions for calculating certificate eligibility based on duration

### Phase 2: Backend Implementation

1. **Create API Endpoint for Teams Excel/CSV Upload:**

   ```typescript
   // app/api/attendance/upload/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/lib/server';
   import { processTeamsAttendanceFile } from '@/lib/attendance-processor';

   export async function POST(request: NextRequest) {
     try {
       // Check authentication and authorization
       const supabase = createClient();
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         return NextResponse.json(
           { error: 'Unauthorized' },
           { status: 401 }
         );
       }
       
       // Check if user is admin or faculty
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();
         
       if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
         return NextResponse.json(
           { error: 'Forbidden: Only admins and faculty can upload attendance data' },
           { status: 403 }
         );
       }
       
       // Get form data
       const formData = await request.formData();
       const file = formData.get('file') as File;
       const sessionId = formData.get('sessionId') as string;
       
       if (!file || !sessionId) {
         return NextResponse.json(
           { error: 'Missing required fields: file or sessionId' },
           { status: 400 }
         );
       }
       
       // Validate file type
       const fileName = file.name.toLowerCase();
       if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
         return NextResponse.json(
           { error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file' },
           { status: 400 }
         );
       }
       
       // Validate session exists
       const { data: session, error: sessionError } = await supabase
         .from('sessions')
         .select('id, title')
         .eq('id', sessionId)
         .single();
         
       if (sessionError || !session) {
         return NextResponse.json(
           { error: 'Session not found' },
           { status: 404 }
         );
       }
       
       // Process the file
       const fileBuffer = await file.arrayBuffer();
       const result = await processTeamsAttendanceFile(fileBuffer, sessionId, user.id);
       
       return NextResponse.json(result);
     } catch (error: any) {
       console.error('Error processing attendance file:', error);
       
       return NextResponse.json(
         { error: error.message || 'An error occurred while processing the file' },
         { status: 500 }
       );
     }
   }
   ```

2. **Create Attendance Processing Service:**

   ```typescript
   // lib/attendance-processor.ts
   import * as XLSX from 'xlsx';
   import { createClient } from './server';
   
   export async function processTeamsAttendanceFile(fileBuffer: ArrayBuffer, sessionId: string, uploadedBy: string) {
     const supabase = createClient();
     
     try {
       // Parse the Excel/CSV file
       const workbook = XLSX.read(fileBuffer, { type: 'array' });
       const firstSheetName = workbook.SheetNames[0];
       const worksheet = workbook.Sheets[firstSheetName];
       
       // Convert to JSON (array of arrays to preserve structure)
       const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
       
       // Identify sections in the file
       const sections = identifyTeamsFileSections(rawData);
       const { summarySection, participantsSection, activitiesSection } = sections;
       
       // Extract meeting metadata
       const meetingInfo = extractMeetingInfo(summarySection);
       
       // Process participants section
       const participantRecords = processParticipantsSection(participantsSection);
       
       // Process detailed activities
       const detailedActivities = processActivitiesSection(activitiesSection);
       const activitiesByEmail = groupActivitiesByEmail(detailedActivities);
       
       // Get session settings or use defaults
       const { data: settings } = await supabase
         .from('session_settings')
         .select('min_attendance_minutes')
         .eq('session_id', sessionId)
         .single();
         
       const minAttendanceMinutes = settings?.min_attendance_minutes || 30; // Default to 30 minutes
       
       // Process each participant
       const results = [];
       let successCount = 0;
       let errorCount = 0;
       
       for (const participant of participantRecords) {
         try {
           const email = participant.email?.toLowerCase();
           if (!email) {
             results.push({
               status: 'error',
               message: 'Missing email address',
               name: participant.name
             });
             errorCount++;
             continue;
           }
           
           // Find user by email
           const { data: users } = await supabase
             .from('profiles')
             .select('id, full_name')
             .eq('email', email);
             
           if (!users || users.length === 0) {
             results.push({
               status: 'error',
               message: 'User not found in system',
               email,
               name: participant.name
             });
             errorCount++;
             continue;
           }
           
           const user = users[0];
           
           // Calculate duration
           const detailedDurationData = activitiesByEmail[email] || [];
           const durationMinutes = detailedDurationData.length > 0
             ? calculateDetailedDuration(detailedDurationData)
             : parseDurationString(participant.inMeetingDuration);
             
           // Parse join and leave times
           const joinTime = parseTeamsDateTime(participant.firstJoin);
           const leaveTime = parseTeamsDateTime(participant.lastLeave);
           
           // Determine certificate eligibility
           const isEligible = durationMinutes >= minAttendanceMinutes;
           
           // Create or update attendance record
           const { data: existingRecord } = await supabase
             .from('session_attendance')
             .select('id')
             .eq('user_id', user.id)
             .eq('session_id', sessionId)
             .single();
             
           const { error: attendanceError } = await supabase
             .from('session_attendance')
             .upsert({
               id: existingRecord?.id,
               user_id: user.id,
               session_id: sessionId,
               check_in_time: joinTime.toISOString(),
               join_time: joinTime.toISOString(),
               leave_time: leaveTime.toISOString(),
               duration_minutes: durationMinutes,
               is_eligible_for_certificate: isEligible,
               attendance_source: 'teams_csv',
               status: isEligible ? 'approved' : 'rejected',
               approved_by: isEligible ? uploadedBy : null,
               approved_at: isEligible ? new Date().toISOString() : null,
               notes: isEligible ? null : `Insufficient attendance duration (${durationMinutes} min < required ${minAttendanceMinutes} min)`
             }, {
               onConflict: 'user_id,session_id'
             });
             
           if (attendanceError) throw new Error(attendanceError.message);
           
           results.push({
             status: 'success',
             userId: user.id,
             name: user.full_name,
             email,
             duration: durationMinutes,
             isEligible
           });
           
           successCount++;
         } catch (error: any) {
           console.error('Error processing participant:', participant, error);
           results.push({
             status: 'error',
             message: error.message || 'Processing error',
             email: participant.email,
             name: participant.name
           });
           errorCount++;
         }
       }
       
       // Create upload history record
       await supabase
         .from('attendance_upload_history')
         .insert({
           session_id: sessionId,
           uploaded_by: uploadedBy,
           filename: 'Teams Attendance',
           record_count: participantRecords.length,
           success_count: successCount,
           error_count: errorCount,
           status: 'completed'
         });
        
       return {
         total: participantRecords.length,
         processed: participantRecords.length,
         successful: successCount,
         failed: errorCount,
         results
       };
     } catch (error: any) {
       // Log the error
       console.error('Error processing Teams attendance file:', error);
       
       // Create error record in upload history
       await supabase
         .from('attendance_upload_history')
         .insert({
           session_id: sessionId,
           uploaded_by: uploadedBy,
           filename: 'Teams Attendance',
           record_count: 0,
           success_count: 0,
           error_count: 1,
           status: 'failed',
           error_message: error.message || 'Unknown error'
         });
        
       throw error;
     }
   }
   ```

3. **Add API Endpoint for Session Settings:**

   ```typescript
   // app/api/sessions/[id]/settings/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/lib/server';

   export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
     try {
       const sessionId = params.id;
       const supabase = createClient();
       
       const { data, error } = await supabase
         .from('session_settings')
         .select('*')
         .eq('session_id', sessionId)
         .single();
         
       if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
         throw error;
       }
       
       // Return default settings if none exist
       if (!data) {
         return NextResponse.json({
           session_id: sessionId,
           min_attendance_minutes: 30,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         });
       }
       
       return NextResponse.json(data);
     } catch (error: any) {
       return NextResponse.json(
         { error: error.message || 'An error occurred' },
         { status: 500 }
       );
     }
   }

   export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
     try {
       const sessionId = params.id;
       const supabase = createClient();
       
       // Check authentication and authorization
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         return NextResponse.json(
           { error: 'Unauthorized' },
           { status: 401 }
         );
       }
       
       // Check if user is admin or faculty
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();
         
       if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
         return NextResponse.json(
           { error: 'Forbidden: Only admins and faculty can update session settings' },
           { status: 403 }
         );
       }
       
       const body = await request.json();
       
       // Validate input
       if (typeof body.min_attendance_minutes !== 'number' || body.min_attendance_minutes < 1) {
         return NextResponse.json(
           { error: 'Invalid minimum attendance minutes' },
           { status: 400 }
         );
       }
       
       // Update or create settings
       const { data, error } = await supabase
         .from('session_settings')
         .upsert({
           session_id: sessionId,
           min_attendance_minutes: body.min_attendance_minutes,
           updated_at: new Date().toISOString()
         }, {
           onConflict: 'session_id'
         })
         .select();
         
       if (error) throw error;
       
       return NextResponse.json(data[0]);
     } catch (error: any) {
       return NextResponse.json(
         { error: error.message || 'An error occurred' },
         { status: 500 }
       );
     }
   }
   ```

4. **Add API Endpoint for Upload History:**

   ```typescript
   // app/api/attendance/upload-history/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/lib/server';

   export async function GET(request: NextRequest) {
     try {
       const supabase = createClient();
       
       // Check authentication and authorization
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         return NextResponse.json(
           { error: 'Unauthorized' },
           { status: 401 }
         );
       }
       
       // Check if user is admin or faculty
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();
         
       if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
         return NextResponse.json(
           { error: 'Forbidden: Only admins and faculty can view upload history' },
           { status: 403 }
         );
       }
       
       // Get query parameters
       const url = new URL(request.url);
       const sessionId = url.searchParams.get('sessionId');
       const limit = parseInt(url.searchParams.get('limit') || '10', 10);
       
       // Build query
       let query = supabase
         .from('attendance_upload_history')
         .select(`
           id, 
           session_id,
           uploaded_by,
           uploaded_at,
           filename,
           record_count,
           success_count,
           error_count,
           status,
           error_message,
           sessions (title),
           profiles:uploaded_by (full_name)
         `)
         .order('uploaded_at', { ascending: false })
         .limit(limit);
         
       // Add session filter if provided
       if (sessionId) {
         query = query.eq('session_id', sessionId);
       }
       
       const { data, error } = await query;
       
       if (error) throw error;
       
       return NextResponse.json(data);
     } catch (error: any) {
       return NextResponse.json(
         { error: error.message || 'An error occurred' },
         { status: 500 }
       );
     }
   }
   ```

### Phase 3: Frontend Implementation

1. **Create Teams Attendance Upload Component:**
   ```tsx
   // Example component structure
   const TeamsAttendanceUpload = ({ sessionId }) => {
     const [file, setFile] = useState<File | null>(null);
     const [isUploading, setIsUploading] = useState(false);
     const [uploadResult, setUploadResult] = useState<any>(null);
     const [error, setError] = useState<string | null>(null);
     
     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const selectedFile = e.target.files?.[0];
       if (selectedFile) {
         // Validate file type (Excel or CSV)
         if (!/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
           setError('Please upload an Excel or CSV file');
           return;
         }
         setFile(selectedFile);
         setError(null);
       }
     };
     
     const handleUpload = async () => {
       if (!file) return;
       
       setIsUploading(true);
       setError(null);
       
       const formData = new FormData();
       formData.append('file', file);
       formData.append('sessionId', sessionId);
       
       try {
         const response = await fetch('/api/attendance/upload', {
           method: 'POST',
           body: formData,
         });
         
         if (!response.ok) {
           throw new Error('Upload failed');
         }
         
         const result = await response.json();
         setUploadResult(result);
       } catch (err: any) {
         setError(err.message || 'An error occurred during upload');
       } finally {
         setIsUploading(false);
       }
     };
     
     return (
       <div className="p-4 border rounded-lg bg-white shadow-sm">
         <h3 className="text-lg font-medium mb-4">Upload Teams Attendance</h3>
         
         <div className="space-y-4">
           <div>
             <Label htmlFor="attendance-file">Select Teams Attendance Excel/CSV</Label>
             <Input 
               id="attendance-file" 
               type="file" 
               accept=".xlsx,.xls,.csv" 
               onChange={handleFileChange} 
               className="mt-1"
             />
             {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
           </div>
           
           <Button 
             onClick={handleUpload} 
             disabled={!file || isUploading}
             className="w-full"
           >
             {isUploading ? (
               <>
                 <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                 Processing...
               </>
             ) : 'Upload Attendance'}
           </Button>
         </div>
         
         {uploadResult && (
           <div className="mt-4 p-4 border rounded-lg bg-gray-50">
             <h4 className="font-medium mb-2">Upload Results</h4>
             <div className="grid grid-cols-2 gap-2 text-sm">
               <div>Total Records:</div>
               <div>{uploadResult.total}</div>
               
               <div>Successfully Processed:</div>
               <div className="text-green-600">{uploadResult.successful}</div>
               
               <div>Failed Records:</div>
               <div className="text-red-600">{uploadResult.failed}</div>
             </div>
             
             {uploadResult.failed > 0 && (
               <div className="mt-4">
                 <h5 className="font-medium mb-1">Failed Records</h5>
                 <div className="max-h-40 overflow-y-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr>
                         <th className="text-left">Name</th>
                         <th className="text-left">Email</th>
                         <th className="text-left">Reason</th>
                       </tr>
                     </thead>
                     <tbody>
                       {uploadResult.results
                         .filter(r => r.status === 'error')
                         .map((record, i) => (
                           <tr key={i}>
                             <td>{record.name}</td>
                             <td>{record.email}</td>
                             <td>{record.message}</td>
                           </tr>
                         ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
           </div>
         )}
       </div>
     );
   };
   ```

2. **Enhance Attendance Management Interface:**
   - Add "Upload Teams Attendance" tab/button in the admin attendance interface
   - Display attendance duration in minutes for each record
   - Add eligibility status indicator based on minimum duration requirements
   - Show attendance source (manual check-in vs. Teams CSV) with different icons
   - Add upload history section showing previous uploads with timestamps and success rates

3. **Add Session Settings Interface:**
   ```tsx
   // Example component structure
   const SessionAttendanceSettings = ({ sessionId }) => {
     const [settings, setSettings] = useState({
       minAttendanceMinutes: 30
     });
     const [isSaving, setIsSaving] = useState(false);
     
     useEffect(() => {
       // Fetch existing settings
       const fetchSettings = async () => {
         const supabase = createClient();
         const { data, error } = await supabase
           .from('session_settings')
           .select('*')
           .eq('session_id', sessionId)
           .single();
           
         if (!error && data) {
           setSettings({
             minAttendanceMinutes: data.min_attendance_minutes
           });
         }
       };
       
       fetchSettings();
     }, [sessionId]);
     
     const handleSave = async () => {
       setIsSaving(true);
       
       try {
         const supabase = createClient();
         const { error } = await supabase
           .from('session_settings')
           .upsert({
             session_id: sessionId,
             min_attendance_minutes: settings.minAttendanceMinutes,
             updated_at: new Date().toISOString()
           }, {
             onConflict: 'session_id'
           });
           
         if (error) throw error;
         
         toast({
           title: 'Success',
           description: 'Attendance settings updated successfully',
         });
       } catch (error) {
         toast({
           title: 'Error',
           description: 'Failed to update attendance settings',
           variant: 'destructive',
         });
       } finally {
         setIsSaving(false);
       }
     };
     
     return (
       <div className="p-4 border rounded-lg bg-white shadow-sm">
         <h3 className="text-lg font-medium mb-4">Attendance Requirements</h3>
         
         <div className="space-y-4">
           <div>
             <Label htmlFor="min-attendance">Minimum Attendance Duration (minutes)</Label>
             <div className="flex items-center gap-2">
               <Input 
                 id="min-attendance" 
                 type="number" 
                 min="1"
                 value={settings.minAttendanceMinutes}
                 onChange={(e) => setSettings({
                   ...settings,
                   minAttendanceMinutes: parseInt(e.target.value, 10)
                 })}
               />
               <span>minutes</span>
             </div>
             <p className="text-sm text-gray-500 mt-1">
               Attendees must be present for at least this duration to be eligible for a certificate.
             </p>
           </div>
           
           <Button 
             onClick={handleSave} 
             disabled={isSaving}
           >
             {isSaving ? 'Saving...' : 'Save Settings'}
           </Button>
         </div>
       </div>
     );
   };
   ```

4. **Implement Enhanced Attendance Table:**
   - Add duration column showing attendance time in minutes
   - Add certificate eligibility indicator
   - Implement filtering by eligibility status

### Phase 4: Testing and Validation

1. **Unit Testing:**
   - Test CSV/Excel parsing functions
   - Test duration calculation logic
   - Test eligibility determination
   - Test Teams date/time format parsing

2. **Integration Testing:**
   - Test file upload and processing
   - Test attendance record updates
   - Test session settings management
   - Verify RLS policies work correctly

3. **User Acceptance Testing:**
   - Test with real Teams attendance files from different meeting types
   - Verify correct attendance records creation and updates
   - Confirm certificate eligibility logic works as expected
   - Test edge cases (users with multiple join/leave events, very short attendances)

## Implementation Timeline
   - Number of records updated
   - Any errors encountered
6. Admin can review the updated attendance records
7. System automatically marks eligible attendees for certificates

### For Users

1. User experience remains largely unchanged
2. Users can see their attendance duration and eligibility status in their dashboard
3. Certificate eligibility is automatically determined based on attendance duration

## Technical Details

### CSV Processing Logic

```typescript
// Pseudocode for Teams Excel/CSV processing
async function processTeamsAttendanceFile(file, sessionId) {
  // Parse Excel/CSV file
  const rawData = await parseExcelOrCSV(file);
  
  // Identify sections in the file
  const sections = identifyTeamsFileSections(rawData);
  const { summarySection, participantsSection, activitiesSection } = sections;
  
  // Extract meeting metadata from summary section
  const meetingInfo = extractMeetingInfo(summarySection);
  
  // Process participants section (primary attendance data)
  const participantRecords = processParticipantsSection(participantsSection);
  
  // Process detailed activities section (for more accurate duration calculation)
  const detailedActivities = processActivitiesSection(activitiesSection);
  
  // Group detailed activities by email
  const activitiesByEmail = groupActivitiesByEmail(detailedActivities);
  
  // Process each participant
  const results = await Promise.all(
    participantRecords.map(async (participant) => {
      const email = participant.email.toLowerCase();
      
      // Find user by email
      const user = await findUserByEmail(email);
      
      if (!user) {
        return { 
          status: 'error', 
          message: `User not found: ${email}`,
          email,
          name: participant.name
        };
      }
      
      // Get detailed activities for this participant if available
      const detailedDurationData = activitiesByEmail[email] || [];
      
      // Calculate duration - use detailed activities if available, otherwise use participant summary
      const durationMinutes = detailedDurationData.length > 0
        ? calculateDetailedDuration(detailedDurationData)
        : parseDurationString(participant.inMeetingDuration);
      
      // Parse join and leave times
      const joinTime = parseTeamsDateTime(participant.firstJoin);
      const leaveTime = parseTeamsDateTime(participant.lastLeave);
      
      // Get session settings
      const settings = await getSessionSettings(sessionId);
      
      // Determine certificate eligibility
      const isEligible = durationMinutes >= settings.min_attendance_minutes;
      
      // Create or update attendance record
      const result = await createOrUpdateAttendance({
        userId: user.id,
        sessionId,
        joinTime,
        leaveTime,
        durationMinutes,
        isEligibleForCertificate: isEligible,
        attendanceSource: 'teams_csv',
        status: isEligible ? 'approved' : 'rejected'
      });
      
      return { 
        status: 'success', 
        user, 
        email,
        name: participant.name,
        duration: durationMinutes, 
        isEligible,
        role: participant.role
      };
    })
  );
  
  // Create upload history record
  await createUploadHistory({
    sessionId,
    filename: file.name,
    recordCount: participantRecords.length,
    successCount: results.filter(r => r.status === 'success').length,
    errorCount: results.filter(r => r.status === 'error').length,
    meetingTitle: meetingInfo.title,
    meetingDate: meetingInfo.startTime
  });
  
  // Return summary
  return {
    total: participantRecords.length,
    processed: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    results
  };
}
```

### Helper Functions for Teams Excel Processing

```typescript
// Identify different sections in the Teams attendance file
function identifyTeamsFileSections(rows) {
  let summaryStart = 0;
  let participantsStart = 0;
  let activitiesStart = 0;
  
  // Find section headers
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Summary section typically starts at the beginning
    if (row[0] === '1. Summary') {
      summaryStart = i;
    }
    // Participants section starts with "2. Participants"
    else if (row[0] === '2. Participants') {
      participantsStart = i;
    }
    // In-Meeting Activities section starts with "3. In-Meeting Activities"
    else if (row[0] === '3. In-Meeting Activities') {
      activitiesStart = i;
      break;
    }
  }
  
  // Extract each section
  return {
    summarySection: rows.slice(summaryStart, participantsStart),
    participantsSection: rows.slice(participantsStart, activitiesStart),
    activitiesSection: rows.slice(activitiesStart)
  };
}

// Extract meeting metadata from summary section
function extractMeetingInfo(summaryRows) {
  const info = {};
  
  // Process each row in the summary section
  for (const row of summaryRows) {
    if (row[0] === 'Meeting title') {
      info.title = row[1];
    } else if (row[0] === 'Start time') {
      info.startTime = parseTeamsDateTime(row[1]);
    } else if (row[0] === 'End time') {
      info.endTime = parseTeamsDateTime(row[1]);
    } else if (row[0] === 'Meeting duration') {
      info.duration = parseDurationString(row[1]);
    } else if (row[0] === 'Attended participants') {
      info.participantCount = parseInt(row[1], 10);
    }
  }
  
  return info;
}

// Process the participants section
function processParticipantsSection(participantsRows) {
  const participants = [];
  let headerRow = null;
  
  // Find the header row (contains "Name", "First Join", etc.)
  for (let i = 0; i < participantsRows.length; i++) {
    if (participantsRows[i].includes('Name') && 
        participantsRows[i].includes('Email') && 
        participantsRows[i].includes('Role')) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === null) return [];
  
  // Extract column indices
  const headers = participantsRows[headerRow];
  const nameIndex = headers.indexOf('Name');
  const firstJoinIndex = headers.indexOf('First Join');
  const lastLeaveIndex = headers.indexOf('Last Leave');
  const durationIndex = headers.indexOf('In-Meeting Duration');
  const emailIndex = headers.indexOf('Email');
  const roleIndex = headers.indexOf('Role');
  
  // Process data rows
  for (let i = headerRow + 1; i < participantsRows.length; i++) {
    const row = participantsRows[i];
    if (!row[nameIndex] || !row[emailIndex]) continue;
    
    participants.push({
      name: row[nameIndex],
      firstJoin: row[firstJoinIndex],
      lastLeave: row[lastLeaveIndex],
      inMeetingDuration: row[durationIndex],
      email: row[emailIndex],
      role: row[roleIndex]
    });
  }
  
  return participants;
}

// Process the detailed activities section
function processActivitiesSection(activitiesRows) {
  const activities = [];
  let headerRow = null;
  
  // Find the header row
  for (let i = 0; i < activitiesRows.length; i++) {
    if (activitiesRows[i].includes('Name') && 
        activitiesRows[i].includes('Join Time') && 
        activitiesRows[i].includes('Leave Time')) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === null) return [];
  
  // Extract column indices
  const headers = activitiesRows[headerRow];
  const nameIndex = headers.indexOf('Name');
  const joinTimeIndex = headers.indexOf('Join Time');
  const leaveTimeIndex = headers.indexOf('Leave Time');
  const durationIndex = headers.indexOf('Duration');
  const emailIndex = headers.indexOf('Email');
  
  // Process data rows
  for (let i = headerRow + 1; i < activitiesRows.length; i++) {
    const row = activitiesRows[i];
    if (!row[nameIndex] || !row[emailIndex]) continue;
    
    activities.push({
      name: row[nameIndex],
      joinTime: row[joinTimeIndex],
      leaveTime: row[leaveTimeIndex],
      duration: row[durationIndex],
      email: row[emailIndex]
    });
  }
  
  return activities;
}

// Parse Teams date/time format (MM/DD/YY, H:MM:SS PM)
function parseTeamsDateTime(dateTimeString) {
  if (!dateTimeString) return null;
  
  // Format: MM/DD/YY, H:MM:SS PM
  const [datePart, timePart] = dateTimeString.split(', ');
  if (!datePart || !timePart) return null;
  
  const [month, day, year] = datePart.split('/');
  let [hours, minutes, secondsPeriod] = timePart.split(':');
  
  // Handle seconds and AM/PM
  let seconds = '00';
  let period = 'AM';
  if (secondsPeriod) {
    const match = secondsPeriod.match(/([0-9]+)\s*([AP]M)/);
    if (match) {
      seconds = match[1];
      period = match[2];
    }
  }
  
  // Convert to 24-hour format
  hours = parseInt(hours, 10);
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  // Create ISO date string (YYYY-MM-DDTHH:MM:SS)
  const fullYear = parseInt(year, 10) < 100 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
  const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
  
  return new Date(isoDate);
}

// Parse duration string (e.g., "45m 7s" or "1h 15m")
function parseDurationString(durationString) {
  if (!durationString) return 0;
  
  let totalMinutes = 0;
  
  // Extract hours
  const hoursMatch = durationString.match(/([0-9]+)h/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }
  
  // Extract minutes
  const minutesMatch = durationString.match(/([0-9]+)m/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }
  
  // Extract seconds (convert to fractional minutes)
  const secondsMatch = durationString.match(/([0-9]+)s/);
  if (secondsMatch) {
    totalMinutes += parseInt(secondsMatch[1], 10) / 60;
  }
  
  return Math.round(totalMinutes);
}

// Calculate detailed duration from multiple join/leave events
function calculateDetailedDuration(activities) {
  // Sort activities by join time
  const sortedActivities = [...activities].sort((a, b) => {
    const joinTimeA = parseTeamsDateTime(a.joinTime);
    const joinTimeB = parseTeamsDateTime(b.joinTime);
    return joinTimeA - joinTimeB;
  });
  
  let totalMinutes = 0;
  let lastLeaveTime = null;
  
  // Process each join/leave pair
  for (const activity of sortedActivities) {
    const joinTime = parseTeamsDateTime(activity.joinTime);
    const leaveTime = parseTeamsDateTime(activity.leaveTime);
    
    if (!joinTime || !leaveTime) continue;
    
    // If this join is after the last leave, add the full duration
    if (!lastLeaveTime || joinTime > lastLeaveTime) {
      totalMinutes += (leaveTime - joinTime) / (1000 * 60);
    } 
    // If this join overlaps with the last leave, only add the non-overlapping part
    else if (leaveTime > lastLeaveTime) {
      totalMinutes += (leaveTime - lastLeaveTime) / (1000 * 60);
    }
    
    // Update last leave time if this leave is later
    if (!lastLeaveTime || leaveTime > lastLeaveTime) {
      lastLeaveTime = leaveTime;
    }
  }
  
  return Math.round(totalMinutes);
}
```

## Implementation Timeline

1. **Week 1**: Database schema updates and backend API development
2. **Week 2**: CSV processing service and integration with existing attendance system
3. **Week 3**: Frontend implementation for CSV upload and enhanced attendance management
4. **Week 4**: Testing, bug fixes, and documentation

## Success Metrics

1. Reduction in manual attendance verification time
2. Increased accuracy of attendance records
3. Higher percentage of automatically approved attendance records
4. Positive feedback from administrators on the CSV upload process

## Future Enhancements

1. Support for additional attendance data formats
2. Advanced analytics on attendance patterns
3. Integration with certificate generation system
4. Automated email notifications for eligible/ineligible attendees
5. Attendance visualization tools (charts, graphs)

## Conclusion

This enhancement to the attendance management system will significantly streamline the process of tracking and verifying webinar attendance. By leveraging the attendance data already available from Microsoft Teams, we can automate much of the approval process while ensuring that only participants who meet the minimum attendance requirements receive certificates.
