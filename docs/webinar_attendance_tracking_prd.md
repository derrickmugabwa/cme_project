# Webinar Attendance Check-in System with Admin Approval

## 1. Overview

### 1.1 Problem Statement
Currently, there is no reliable way to track attendance for webinar sessions. We need a system that records when users join webinar meetings and allows administrators or faculty members to verify and approve attendance.

### 1.2 Solution
Implement a check-in system where:
1. Users initiate attendance tracking when clicking "Join Meeting"
2. Administrators/faculty review and approve attendance records
3. Only approved attendance records count as valid attendance

## 2. Current Database Schema Analysis

Based on the analysis of the existing database schema:

**Sessions Table**
- Contains webinar session details (id, title, description, start/end times, etc.)
- Has fields for meeting links (teams_join_url) and online status (is_online)
- Already tracks the creator of sessions (created_by)

**Profiles Table**
- Contains user information including role (user, faculty, admin)
- Has fields for professional information (title, institution, etc.)

**Enrollments Table**
- Currently references courses, not sessions
- Uses student_id which is no longer appropriate for the role structure
- Has foreign key constraints to profiles and courses tables

## 3. Database Schema Updates Required

### 3.1 Update Enrollments Table
We need to modify the enrollments table to reference sessions instead of courses:

```sql
-- First create a new session_enrollments table
CREATE TABLE session_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'enrolled',
  UNIQUE(user_id, session_id)
);

-- Add RLS policies
ALTER TABLE session_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own enrollments
CREATE POLICY "Users can view their own enrollments"
  ON session_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own enrollments
CREATE POLICY "Users can insert their own enrollments"
  ON session_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins/faculty to view all enrollments
CREATE POLICY "Admins and faculty can view all enrollments"
  ON session_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- Policy for admins/faculty to update enrollments
CREATE POLICY "Admins and faculty can update enrollments"
  ON session_enrollments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );
```

### 3.2 Create Session Attendance Table

```sql
CREATE TABLE session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending_approval',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, session_id)
);

-- Add RLS policies
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own attendance records
CREATE POLICY "Users can view their own attendance records"
  ON session_attendance
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own attendance records
CREATE POLICY "Users can insert their own attendance records"
  ON session_attendance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins/faculty to view all attendance records
CREATE POLICY "Admins and faculty can view all attendance records"
  ON session_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- Policy for admins/faculty to update attendance records
CREATE POLICY "Admins and faculty can update attendance records"
  ON session_attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );
```

## 4. Functional Requirements

### 4.1 Enrollment Process
1. Users can enroll in webinar sessions from the sessions list or detail page
2. Enrollment is recorded in the session_enrollments table
3. Enrollment status can be "enrolled" or "cancelled"

### 4.2 User Check-in Process
1. When a user clicks "Join Meeting" on a webinar session:
   - Verify the user is enrolled in the session
   - Check if an attendance record already exists
   - If not, create a new attendance record with status "pending_approval"
   - Record the check-in timestamp
   - Redirect user to the meeting URL
   - Display a confirmation message that attendance has been initiated

### 4.3 Admin Approval Interface
1. Create an admin view that shows all pending attendance records
2. Allow filtering by session, date, and status
3. Enable bulk or individual approval of attendance records
4. Provide ability to add notes or reasons for rejection

### 4.4 Attendance Status Management
1. Define clear attendance statuses:
   - "pending_approval": User has checked in but not yet approved
   - "approved": Admin has verified attendance
   - "rejected": Admin has rejected the attendance claim
   - "no_show": Enrolled but did not attend

### 4.5 Reporting
1. Generate attendance reports by session or user
2. Show attendance statistics (approved vs. pending vs. rejected)
3. Allow export of attendance data to CSV/Excel

## 5. Technical Implementation

### 5.1 Backend Implementation
1. Create API endpoints for session enrollment:
   ```
   POST /api/sessions/:id/enroll
   DELETE /api/sessions/:id/enroll (for cancellation)
   ```

2. Create API endpoint for recording check-ins:
   ```
   POST /api/attendance/check-in
   Body: { sessionId }
   ```

3. Create API endpoints for admin approval:
   ```
   GET /api/attendance/pending
   PUT /api/attendance/:id/approve
   PUT /api/attendance/:id/reject
   ```

4. Implement RLS policies as defined in the schema updates section

### 5.2 Frontend Implementation
1. Update the session detail page to include an "Enroll" button
2. Modify the "Join Meeting" button to:
   ```javascript
   async function handleJoinMeeting() {
     try {
       // Record attendance check-in
       const response = await fetch('/api/attendance/check-in', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ 
           sessionId: session.id
         })
       });
       
       if (!response.ok) {
         throw new Error('Failed to record attendance');
       }
       
       // Show success message
       toast.success('Your attendance has been recorded and is pending approval');
       
       // Open meeting URL
       window.open(session.teams_join_url, '_blank');
     } catch (error) {
       toast.error('Failed to record attendance: ' + error.message);
       // Still open the meeting URL even if attendance recording fails
       window.open(session.teams_join_url, '_blank');
     }
   }
   ```

3. Create an admin attendance approval interface:
   - Table view of pending attendance records
   - Checkboxes for bulk selection
   - Approve/Reject buttons with confirmation dialog

## 6. User Experience

### 6.1 For Regular Users
1. User browses available webinar sessions
2. User enrolls in a session of interest
3. When it's time for the session, user navigates to the session detail page
4. User clicks "Join Meeting" button
5. System shows a toast notification: "Your attendance has been recorded and is pending approval"
6. User is redirected to the meeting
7. After the session, user can see their attendance status in their dashboard

### 6.2 For Admins/Faculty
1. Admin navigates to "Attendance Management" in the admin dashboard
2. Views list of pending attendance records
3. Can filter by session, date range, or status
4. Selects records to approve or reject
5. Can add notes for rejected attendance
6. System confirms the approval/rejection action

## 7. Implementation Plan

### 7.1 Phase 1: Database Schema Updates
1. Create the session_enrollments table
2. Create the session_attendance table
3. Implement RLS policies for both tables

### 7.2 Phase 2: Enrollment Functionality
1. Create API endpoints for enrollment management
2. Update UI to allow users to enroll in sessions
3. Add enrollment status display to user dashboard

### 7.3 Phase 3: Check-in Functionality
1. Modify "Join Meeting" button to record attendance
2. Create API endpoint for check-in
3. Update session detail page to show check-in status

### 7.4 Phase 4: Admin Approval Interface
1. Create attendance management page for admins
2. Implement approval/rejection functionality
3. Add filtering and sorting capabilities

### 7.5 Phase 5: Reporting and Analytics
1. Create attendance reports
2. Implement dashboard widgets for attendance statistics
3. Add export functionality

## 8. Success Metrics
1. Percentage of webinar sessions with accurate attendance records
2. Admin time saved compared to manual attendance tracking
3. User satisfaction with the enrollment and attendance process

## 9. Security and Privacy Considerations
1. Ensure RLS policies protect enrollment and attendance data
2. Log all approval/rejection actions for audit purposes
3. Implement rate limiting on enrollment and check-in APIs to prevent abuse
