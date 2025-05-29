# Microsoft Teams Integration for CME Platform - Technical PRD

## 1. Overview

This document provides a comprehensive technical specification for the Microsoft Teams integration within the CME Platform. It covers the complete workflow from authentication to meeting creation, attendance tracking, and user interface components.

## 2. Database Schema

### 2.1 Core Tables

#### Sessions Table Extensions
```sql
-- Teams-related columns in sessions table
ALTER TABLE sessions ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN teams_meeting_id TEXT;
ALTER TABLE sessions ADD COLUMN teams_join_url TEXT;
ALTER TABLE sessions ADD COLUMN teams_calendar_event_id TEXT;
ALTER TABLE sessions ADD COLUMN teams_recording_url TEXT;
ALTER TABLE sessions ADD COLUMN teams_error TEXT;
```

#### Attendance Table Extensions
```sql
-- Teams-related columns in attendance table
ALTER TABLE attendance ADD COLUMN teams_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN teams_join_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN teams_leave_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN teams_duration_minutes INTEGER;
ALTER TABLE attendance ADD COLUMN verification_method TEXT CHECK (verification_method IN ('code', 'teams', 'both', 'manual'));
```

#### Microsoft Graph Tokens Table
```sql
CREATE TABLE ms_graph_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- RLS policy for token security
ALTER TABLE ms_graph_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY ms_graph_tokens_policy ON ms_graph_tokens
  FOR ALL
  USING (profile_id = auth.uid() OR 
         auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
```

## 3. Authentication Implementation

### 3.1 Microsoft Endpoints Configuration

```javascript
// microsoftEndpoints.js
const COMMON_ENDPOINT = 'common'; // Can be used for both personal and work accounts
const accountType = COMMON_ENDPOINT;

const microsoftEndpoints = {
  // Authorization endpoint
  authorizationEndpoint: `https://login.microsoftonline.com/${accountType}/oauth2/v2.0/authorize`,
  
  // Token endpoint for getting and refreshing tokens
  tokenEndpoint: `https://login.microsoftonline.com/${accountType}/oauth2/v2.0/token`,
  
  // Graph API endpoint
  graphApiEndpoint: 'https://graph.microsoft.com/v1.0'
};

export default microsoftEndpoints;
```

### 3.2 Authentication Flow

#### Initiate Authentication (route.ts)
```typescript
// GET /api/auth/microsoft
export async function GET(request: NextRequest) {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Build Microsoft OAuth URL with required scopes
  const scopes = [
    'offline_access', // Required for refresh tokens
    'openid',
    'User.Read',
    'OnlineMeetings.ReadWrite',
    'Calendars.ReadWrite'
  ]
  
  const authUrl = `${microsoftEndpoints.authorizationEndpoint}?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&response_mode=query` +
    `&prompt=consent` +
    `&state=${user.id}`
  
  return NextResponse.json({ authUrl })
}
```

#### Handle Callback (callback/route.ts)
```typescript
// GET /api/auth/microsoft/callback
export async function GET(request: NextRequest) {
  // Get code and state from callback
  const code = searchParams.get('code')
  const state = searchParams.get('state') // User ID
  
  // Exchange code for tokens
  const tokenResponse = await fetch(microsoftEndpoints.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  
  const tokenData = await tokenResponse.json()
  
  // Calculate token expiration
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)
  
  // Store tokens in database
  await supabase.from('ms_graph_tokens').upsert({
    profile_id: state,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  })
  
  return NextResponse.redirect('/dashboard/microsoft-connect?status=success')
}
```

### 3.3 Graph Authentication Provider

```javascript
// graphAuthProvider.js
class GraphAuthProvider {
  // Get access token directly
  async getAccessTokenDirectly(userId) {
    try {
      // Get the user's Microsoft Graph tokens from the database
      const { data, error } = await this.supabase
        .from('ms_graph_tokens')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (!data) {
        throw new Error('Microsoft account not connected. Please connect your Microsoft account to enable Teams integration.');
      }
      
      // Check if refresh token is a placeholder
      if (data.refresh_token === 'pending_refresh_token') {
        throw new Error('Microsoft authentication incomplete. Please reconnect your Microsoft account.');
      }

      // Check if token is expired and needs refresh
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      // Add buffer time (5 minutes) to avoid edge cases
      const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds
      const isExpiredWithBuffer = expiresAt.getTime() - now.getTime() < bufferMs;
      
      if (isExpiredWithBuffer) {
        // Token is expired, refresh it
        const newToken = await this.refreshToken(data.refresh_token, userId);
        return newToken.access_token;
      }

      return data.access_token;
    } catch (error) {
      console.error('Error getting access token directly:', error);
      throw new Error(`Failed to get access token for Microsoft Graph API: ${error.message}`);
    }
  }
  
  // Refresh token implementation
  async refreshToken(refreshToken, userId) {
    try {
      const response = await fetch(microsoftEndpoints.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }
      
      const tokenData = await response.json();
      
      // Update token in database
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
      
      await this.supabase
        .from('ms_graph_tokens')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', userId);
        
      return tokenData;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
}
```

## 4. Teams Meeting Service

### 4.1 Core Implementation

```javascript
// teamsMeetingService.js
class TeamsMeetingService {
  /**
   * Create a Microsoft Teams meeting
   */
  async createTeamsMeeting(userId, sessionData) {
    try {
      // Get access token
      const accessToken = await graphAuthProvider.getAccessTokenDirectly(userId);
      
      // Format meeting request
      const meetingRequest = {
        subject: sessionData.title,
        startDateTime: sessionData.start_time,
        endDateTime: sessionData.end_time,
        participants: {
          organizer: {
            identity: {
              user: { id: userId }
            }
          }
        },
        lobbyBypassSettings: {
          scope: "organization",
          isDialInBypassEnabled: true
        },
        allowAttendeeToEnableCamera: true,
        allowAttendeeToEnableMic: true,
        isEntryExitAnnounced: true,
        allowedPresenters: "roleIsPresenter"
      };
      
      // Create meeting using Graph API
      const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingRequest)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Microsoft Graph API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const meeting = await response.json();
      
      // Return the meeting details needed for our database
      return {
        teams_meeting_id: meeting.id,
        teams_join_url: meeting.joinUrl,
        teams_calendar_event_id: meeting.onlineMeeting?.calendarEventId || null
      };
    } catch (error) {
      console.error('Error creating Teams meeting:', error);
      throw new Error(`Failed to create Microsoft Teams meeting: ${error.message}`);
    }
  }
  
  /**
   * Get Teams meeting attendance report
   */
  async getMeetingAttendance(userId, meetingId) {
    try {
      // Initialize Microsoft Graph client
      const client = Client.initWithMiddleware({
        authProvider: graphAuthProvider.getAuthProvider(userId)
      });
      
      // Get attendance reports
      const attendanceReports = await client.api(`/me/onlineMeetings/${meetingId}/attendanceReports`).get();
      
      if (!attendanceReports.value.length) return [];
      
      // Get the latest report
      const latestReportId = attendanceReports.value[0].id;
      
      // Get attendance records
      const attendanceRecords = await client.api(
        `/me/onlineMeetings/${meetingId}/attendanceReports/${latestReportId}/attendanceRecords`
      ).get();
      
      // Format attendance data
      return attendanceRecords.value.map(record => {
        const joinTime = new Date(record.joinDateTime);
        const leaveTime = new Date(record.leaveDateTime);
        const durationMinutes = Math.round((leaveTime - joinTime) / 60000);
        
        return {
          email: record.emailAddress,
          display_name: record.identity?.displayName || '',
          join_time: record.joinDateTime,
          leave_time: record.leaveDateTime,
          duration_minutes: durationMinutes
        };
      });
    } catch (error) {
      console.error('Error getting Teams meeting attendance:', error);
      throw new Error('Failed to retrieve Microsoft Teams meeting attendance data');
    }
  }
  
  /**
   * Update an existing Teams meeting
   */
  async updateTeamsMeeting(userId, meetingId, sessionData) {
    try {
      // Initialize Microsoft Graph client
      const client = Client.initWithMiddleware({
        authProvider: graphAuthProvider.getAuthProvider(userId)
      });

      // Format meeting update request
      const meetingRequest = {
        subject: sessionData.title,
        startDateTime: sessionData.start_time,
        endDateTime: sessionData.end_time
      };

      // Update the online meeting
      const meeting = await client.api(`/me/onlineMeetings/${meetingId}`).patch(meetingRequest);

      // Return the updated meeting details
      return {
        teams_meeting_id: meeting.id,
        teams_join_url: meeting.joinUrl,
        teams_calendar_event_id: meeting.onlineMeeting?.calendarEventId || null
      };
    } catch (error) {
      console.error('Error updating Teams meeting:', error);
      throw new Error('Failed to update Microsoft Teams meeting');
    }
  }
  
  /**
   * Cancel/delete a Teams meeting
   */
  async cancelTeamsMeeting(userId, meetingId) {
    try {
      // Initialize Microsoft Graph client
      const client = Client.initWithMiddleware({
        authProvider: graphAuthProvider.getAuthProvider(userId)
      });

      // Delete the online meeting
      await client.api(`/me/onlineMeetings/${meetingId}`).delete();
      
      return true;
    } catch (error) {
      console.error('Error canceling Teams meeting:', error);
      throw new Error('Failed to cancel Microsoft Teams meeting');
    }
  }
}
```

### 4.2 Session Service Integration

```javascript
// sessionService.js
class SessionService {
  /**
   * Create a new session with optional Teams meeting
   */
  async createSession(sessionData, userId, supabaseClient) {
    try {
      // Generate a unique session code
      const sessionCode = this.generateSessionCode();
      
      // Prepare session data
      const newSession = {
        ...sessionData,
        faculty_id: userId,
        session_code: sessionCode
      };
      
      // If it's an online session, try to create a Teams meeting
      if (sessionData.is_online) {
        try {
          // Check if the user has Microsoft auth
          const { data: tokenData } = await supabaseClient
            .from('ms_graph_tokens')
            .select('id')
            .eq('profile_id', userId)
            .single();
            
          if (!tokenData) {
            throw new Error('Microsoft account not connected. Please connect your Microsoft account to create Teams meetings.');
          }
          
          // Create Teams meeting
          const meetingDetails = await teamsMeetingService.createTeamsMeeting(userId, sessionData);
          
          // Add Teams meeting details to session
          newSession.teams_meeting_id = meetingDetails.teams_meeting_id;
          newSession.teams_join_url = meetingDetails.teams_join_url;
          newSession.teams_calendar_event_id = meetingDetails.teams_calendar_event_id;
        } catch (error) {
          console.error('Error creating Teams meeting:', error);
          
          // Store the error but still create the session
          newSession.teams_error = error.message;
        }
      }
      
      // Insert session into database
      const { data, error } = await supabaseClient
        .from('sessions')
        .insert(newSession)
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error in createSession:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }
}
```
