import { SupabaseClient } from '@supabase/supabase-js';
import { TeamsAttendanceData } from './teams-attendance-parser';

// Extended TeamsParticipant interface to include UPN field
interface TeamsParticipant {
  name: string;
  email: string;
  joinTime: Date;
  leaveTime: Date;
  durationMinutes: number;
  inMeetingDuration?: string; // Format: "1h 23m 45s"
  firstJoin?: string; // Format: "5/15/2023, 10:00:00 AM"
  lastLeave?: string; // Format: "5/15/2023, 11:23:45 AM"
  upn?: string; // User Principal Name (often used in Microsoft systems)
}

interface ProcessResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    name: string;
    email: string;
    error: string;
  }>;
}

/**
 * Process Teams attendance data and save to database
 */
export async function processTeamsAttendanceFile(
  supabase: SupabaseClient,
  teamsData: TeamsAttendanceData,
  sessionId: string,
  userId: string,
  rawData: string[][] = []
): Promise<ProcessResult> {
  
  // Get session settings for minimum attendance duration
  // Get session settings including percentage-based attendance settings
  const { data: sessionSettings } = await supabase
    .from('session_settings')
    .select('min_attendance_minutes, use_percentage, attendance_percentage')
    .eq('session_id', sessionId)
    .single();
  
  // Default settings if not found
  const minAttendanceMinutes = sessionSettings?.min_attendance_minutes || 30; // Default to 30 minutes
  const usePercentage = sessionSettings?.use_percentage || false; // Default to fixed minutes
  const attendancePercentage = sessionSettings?.attendance_percentage || 50; // Default to 50%
  
  // Get meeting duration from the Teams data if available
  let durationMinutes: number | undefined;
  
  console.log('Meeting info from Teams data:', JSON.stringify(teamsData.meetingInfo, null, 2));
  
  if (teamsData.meetingInfo) {
    // First try to use the duration directly from the meetingInfo if available
    if (teamsData.meetingInfo.durationMinutes) {
      durationMinutes = teamsData.meetingInfo.durationMinutes;
      console.log(`Using meeting duration directly from CSV: ${durationMinutes} minutes`);
    }
    // Otherwise calculate from start and end times
    else if (teamsData.meetingInfo.startTime && teamsData.meetingInfo.endTime) {
      const startTime = new Date(teamsData.meetingInfo.startTime);
      const endTime = new Date(teamsData.meetingInfo.endTime);
      durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      console.log('Calculated meeting duration from times:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        calculatedDurationMinutes: durationMinutes
      });
    } else {
      console.log('No duration or start/end times available in meeting info');
    }
  } else {
    console.log('No meeting info available from Teams data to update session duration');
  }
  
  if (durationMinutes && durationMinutes > 0) {
    console.log(`Updating session ${sessionId} with meeting duration: ${durationMinutes} minutes`);
    
    // Get current session data for comparison
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('duration_minutes')
      .eq('id', sessionId)
      .single();
    
    console.log('Current session duration:', currentSession?.duration_minutes);
    
    // Update the session with the meeting duration
    const { data: updateResult, error: updateError } = await supabase
      .from('sessions')
      .update({
        duration_minutes: durationMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select();
    
    if (updateError) {
      console.error('Error updating session duration:', updateError);
    } else {
      console.log('Session duration updated successfully:', updateResult);
    }
  }
  
  // Process each participant
  const result: ProcessResult = {
    totalRecords: teamsData.participants.length,
    successCount: 0,
    errorCount: 0,
    errors: []
  };
  
  // Add UPN field from Participant ID column if available
  const enhancedParticipants = teamsData.participants.map(p => {
    // Check if there's a Participant ID in the raw data for this participant
    const participantRow = rawData && rawData.length > 0 ? rawData.find(row => 
      row.length > 0 && row[0] === p.name
    ) : null;
    
    if (participantRow && participantRow.length >= 6) {
      return { ...p, upn: participantRow[5] }; // Assuming Participant ID (UPN) is in column 6
    }
    return p;
  });
  
  /**
 * Find user profile by email or name
 */
async function findUserProfileByEmail(supabase: SupabaseClient, participant: TeamsParticipant): Promise<any | null> {
  const email = participant.email.toLowerCase();
  const upn = participant.upn?.toLowerCase();
  const name = participant.name;
  
  console.log(`Finding user profile for: ${name}, email: ${email}, upn: ${upn || 'N/A'}`);
  
  // Strategy 1: Try exact email match first
  const { data: exactMatch } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
  
  if (exactMatch) {
    console.log(`Found exact email match for ${email}: ${exactMatch.full_name}`);
    return exactMatch;
  }
  
  // Strategy 2: Try UPN match if available
  if (upn) {
    const { data: upnMatch } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', upn)
      .single();
    
    if (upnMatch) {
      console.log(`Found UPN match for ${upn}: ${upnMatch.full_name}`);
      return upnMatch;
    }
  }
  
  // Strategy 3: Try partial match (username part of email)
  const username = email.split('@')[0].toLowerCase();
  if (username) {
    const { data: partialMatches } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', `${username}@%`);
    
    if (partialMatches && partialMatches.length > 0) {
      console.log(`Found partial email match for ${username}: ${partialMatches[0].full_name}`);
      return partialMatches[0]; // Return the first match
    }
  }
  
  // Strategy 4: Try name-based match as last resort
  if (name) {
    // Split name into parts
    const nameParts = name.toLowerCase().split(' ');
    
    if (nameParts.length >= 2) {
      // Try to match first and last name
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      const { data: nameMatches } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${firstName}%,full_name.ilike.%${lastName}%`);
      
      if (nameMatches && nameMatches.length > 0) {
        // Sort by best match (most name parts matched)
        const bestMatch = nameMatches.sort((a, b) => {
          const aNameParts = a.full_name.toLowerCase().split(' ');
          const bNameParts = b.full_name.toLowerCase().split(' ');
          
          const aMatches = nameParts.filter(part => 
            aNameParts.some((p: string) => p.includes(part) || part.includes(p)));
          const bMatches = nameParts.filter(part => 
            bNameParts.some((p: string) => p.includes(part) || part.includes(p)));
          
          return bMatches.length - aMatches.length;
        })[0];
        
        console.log(`Found name-based match for ${name}: ${bestMatch.full_name}`);
        return bestMatch;
      }
    }
  }
  
  console.log(`No match found for ${name} (${email})`);
  return null;
}

  // Get all profiles to do flexible matching
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, username, full_name');
  
  // Process each participant
  for (const participant of enhancedParticipants) {
    try {
      // Find matching profile using our enhanced matching function
      const matchingProfile = await findUserProfileByEmail(supabase, participant);
      if (!matchingProfile) {
        console.log(`No match found for: ${participant.name} (${participant.email})`);
        result.errorCount++;
        result.errors.push({
          name: participant.name,
          email: participant.email,
          error: 'User not found in system'
        });
        continue;
      }
      
      console.log(`Match found for: ${participant.name} -> ${matchingProfile.email}`);
      
      // Check if attendance record already exists
      const { data: existingRecord } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', matchingProfile.id)
        .single();
      
      // Calculate required minutes for certificate eligibility
      let requiredMinutes: number;
      
      if (usePercentage && durationMinutes) {
        // Use percentage of meeting duration from the CSV
        requiredMinutes = Math.max(1, Math.floor(durationMinutes * attendancePercentage / 100));
        console.log(`Using percentage-based eligibility: ${attendancePercentage}% of ${durationMinutes} minutes = ${requiredMinutes} minutes required`);
      } else if (usePercentage && !durationMinutes) {
        // Fallback to session duration if CSV duration not available
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('duration_minutes')
          .eq('id', sessionId)
          .single();
        
        const sessionDuration = sessionData?.duration_minutes || 60; // Default to 60 minutes
        requiredMinutes = Math.max(1, Math.floor(sessionDuration * attendancePercentage / 100));
        console.log(`Using percentage-based eligibility (from session): ${attendancePercentage}% of ${sessionDuration} minutes = ${requiredMinutes} minutes required`);
      } else {
        // Use fixed minimum minutes
        requiredMinutes = minAttendanceMinutes;
        console.log(`Using fixed eligibility threshold: ${requiredMinutes} minutes required`);
      }
      
      // Determine if eligible for certificate based on duration
      const isEligible = participant.durationMinutes >= requiredMinutes;
      console.log(`Participant ${participant.name} attended for ${participant.durationMinutes} minutes, required ${requiredMinutes} minutes, eligible: ${isEligible}`);
      
      
      // Create or update attendance record
      if (existingRecord) {
        // Only update if the new duration is longer or if the source is different
        const { data: existingAttendance } = await supabase
          .from('session_attendance')
          .select('duration_minutes, attendance_source')
          .eq('id', existingRecord.id)
          .single();
        
        if (existingAttendance && 
            (existingAttendance.attendance_source !== 'teams_csv' || 
             participant.durationMinutes > existingAttendance.duration_minutes)) {
          
          await supabase
            .from('session_attendance')
            .update({
              duration_minutes: participant.durationMinutes,
              is_eligible_for_certificate: isEligible,
              attendance_source: 'teams_csv',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id);
        }
      } else {
        // Create new attendance record
        console.log(`Inserting attendance record for ${matchingProfile.full_name} (${matchingProfile.id}) in session ${sessionId}`)
        const { data, error } = await supabase
          .from('session_attendance')
          .insert({
            session_id: sessionId,
            user_id: matchingProfile.id,
            duration_minutes: participant.durationMinutes,
            is_eligible_for_certificate: isEligible,
            status: 'pending_approval', // Requires admin approval
            attendance_source: 'teams_csv',
            check_in_time: participant.joinTime,
            join_time: participant.joinTime,
            leave_time: participant.leaveTime
          })
          .select();
        
        if (error) {
          console.error('Error inserting attendance record:', error);
        } else {
          console.log('Successfully inserted attendance record:', data);
        }
      }
      
      result.successCount++;
    } catch (error) {
      console.error(`Error processing participant ${participant.name}:`, error);
      result.errorCount++;
      result.errors.push({
        name: participant.name,
        email: participant.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return result;
}
