import { Client } from '@microsoft/microsoft-graph-client';
import graphAuthProvider from './graphAuthProvider';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SessionData {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_online: boolean;
}

class TeamsMeetingService {
  /**
   * Create a Microsoft Teams meeting
   */
  async createTeamsMeeting(userId: string, sessionData: SessionData) {
    try {
      // Initialize Microsoft Graph client
      const client = Client.initWithMiddleware({
        authProvider: graphAuthProvider.getAuthProvider(userId)
      });

      // Format meeting request
      const meetingRequest = {
        subject: sessionData.title,
        startDateTime: new Date(sessionData.start_time).toISOString(),
        endDateTime: new Date(sessionData.end_time).toISOString(),
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
        body: {
          contentType: 'text',
          content: sessionData.description || ''
        }
      };

      // Create online meeting
      const onlineMeeting = await client
        .api('/me/onlineMeetings')
        .post(meetingRequest);

      // Create calendar event
      const calendarEvent = await client
        .api('/me/events')
        .post({
          ...meetingRequest,
          onlineMeeting: {
            joinUrl: onlineMeeting.joinUrl
          }
        });

      // Update session with Teams meeting details
      const { error } = await supabase
        .from('sessions')
        .update({
          teams_meeting_id: onlineMeeting.id,
          teams_join_url: onlineMeeting.joinUrl,
          teams_calendar_event_id: calendarEvent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionData.id);

      if (error) {
        throw new Error(`Failed to update session with Teams meeting details: ${error.message}`);
      }

      return {
        meetingId: onlineMeeting.id,
        joinUrl: onlineMeeting.joinUrl,
        calendarEventId: calendarEvent.id
      };
    } catch (error: any) {
      console.error('Error creating Teams meeting:', error);
      
      // Record the error in the session
      await supabase
        .from('sessions')
        .update({
          teams_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionData.id);
      
      throw new Error(`Failed to create Teams meeting: ${error.message}`);
    }
  }

  /**
   * Update an existing Teams meeting
   */
  async updateTeamsMeeting(userId: string, sessionData: SessionData) {
    try {
      // Get existing meeting details
      const { data: session } = await supabase
        .from('sessions')
        .select('teams_meeting_id, teams_calendar_event_id')
        .eq('id', sessionData.id)
        .single();

      if (!session?.teams_meeting_id || !session?.teams_calendar_event_id) {
        // If no existing meeting, create a new one
        return this.createTeamsMeeting(userId, sessionData);
      }

      // Initialize Microsoft Graph client
      const client = Client.initWithMiddleware({
        authProvider: graphAuthProvider.getAuthProvider(userId)
      });

      // Format meeting request
      const meetingRequest = {
        subject: sessionData.title,
        startDateTime: new Date(sessionData.start_time).toISOString(),
        endDateTime: new Date(sessionData.end_time).toISOString(),
        body: {
          contentType: 'text',
          content: sessionData.description || ''
        }
      };

      // Update calendar event
      await client
        .api(`/me/events/${session.teams_calendar_event_id}`)
        .update(meetingRequest);

      // Update session with timestamp
      const { error } = await supabase
        .from('sessions')
        .update({
          updated_at: new Date().toISOString(),
          teams_error: null // Clear any previous errors
        })
        .eq('id', sessionData.id);

      if (error) {
        throw new Error(`Failed to update session timestamp: ${error.message}`);
      }

      return {
        meetingId: session.teams_meeting_id,
        calendarEventId: session.teams_calendar_event_id
      };
    } catch (error: any) {
      console.error('Error updating Teams meeting:', error);
      
      // Record the error in the session
      await supabase
        .from('sessions')
        .update({
          teams_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionData.id);
      
      throw new Error(`Failed to update Teams meeting: ${error.message}`);
    }
  }

  /**
   * Cancel a Teams meeting
   */
  async cancelTeamsMeeting(userId: string, sessionId: string) {
    try {
      // Get existing meeting details
      const { data: session } = await supabase
        .from('sessions')
        .select('teams_meeting_id, teams_calendar_event_id')
        .eq('id', sessionId)
        .single();

      if (!session?.teams_calendar_event_id) {
        return { success: false, message: 'No Teams meeting found for this session' };
      }

      // Initialize Microsoft Graph client
      const client = Client.initWithMiddleware({
        authProvider: graphAuthProvider.getAuthProvider(userId)
      });

      // Delete calendar event
      await client
        .api(`/me/events/${session.teams_calendar_event_id}`)
        .delete();

      // Update session to remove Teams meeting details
      const { error } = await supabase
        .from('sessions')
        .update({
          teams_meeting_id: null,
          teams_join_url: null,
          teams_calendar_event_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        throw new Error(`Failed to update session after cancellation: ${error.message}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling Teams meeting:', error);
      
      // Record the error in the session
      await supabase
        .from('sessions')
        .update({
          teams_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      throw new Error(`Failed to cancel Teams meeting: ${error.message}`);
    }
  }

  /**
   * Get Teams meeting details
   */
  async getTeamsMeetingDetails(userId: string, sessionId: string) {
    try {
      // Get existing meeting details
      const { data: session } = await supabase
        .from('sessions')
        .select('teams_meeting_id, teams_join_url, teams_calendar_event_id, teams_error')
        .eq('id', sessionId)
        .single();

      if (!session?.teams_meeting_id) {
        return { success: false, message: 'No Teams meeting found for this session' };
      }

      return {
        success: true,
        meetingId: session.teams_meeting_id,
        joinUrl: session.teams_join_url,
        calendarEventId: session.teams_calendar_event_id,
        error: session.teams_error
      };
    } catch (error: any) {
      console.error('Error getting Teams meeting details:', error);
      throw new Error(`Failed to get Teams meeting details: ${error.message}`);
    }
  }
}

// Create a singleton instance
const teamsMeetingService = new TeamsMeetingService();

export default teamsMeetingService;
