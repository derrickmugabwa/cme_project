import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

// Types for Teams attendance data
export interface TeamsParticipant {
  name: string;
  email: string;
  joinTime: Date;
  leaveTime: Date;
  durationMinutes: number;
  inMeetingDuration?: string; // Format: "1h 23m 45s"
  firstJoin?: string; // Format: "5/15/2023, 10:00:00 AM"
  lastLeave?: string; // Format: "5/15/2023, 11:23:45 AM"
  upn?: string; // User Principal Name (often used in Microsoft systems)
  role?: string; // Participant role (e.g., Organizer, Presenter, Attendee)
}

export interface TeamsDetailedActivity {
  name: string;
  email: string;
  action: 'Joined' | 'Left';
  timestamp: Date;
}

export interface TeamsAttendanceData {
  meetingTitle: string;
  meetingStartTime?: Date;
  meetingEndTime?: Date;
  participants: TeamsParticipant[];
  detailedActivities: TeamsDetailedActivity[];
  meetingInfo?: {
    startTime: Date;
    endTime: Date;
    title: string;
    organizer?: string;
    durationMinutes?: number;
  };
}

export interface TeamsFileSections {
  meetingInfoSection: string[][];
  participantsSection: string[][];
  activitiesSection: string[][];
}

/**
 * Parse Teams attendance file (CSV format)
 */
export function parseTeamsAttendanceCSV(csvContent: string): TeamsAttendanceData {
  console.log('Parsing Teams attendance CSV file...');
  
  try {
    // Parse CSV content
    const options = {
      skip_empty_lines: true,
      trim: true,
      columns: false
    };
    
    // Parse the CSV content
    const data = csvParse(csvContent, options) as string[][];
    console.log(`CSV data extracted: ${data.length} rows`);
    
    // Process using common function
    return processTeamsAttendanceFile(data);
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw new Error(`Failed to parse Teams attendance CSV file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse Teams attendance file (Excel format)
 */
export function parseTeamsAttendanceExcel(fileBuffer: ArrayBuffer): TeamsAttendanceData {
  console.log('Parsing Teams attendance Excel file...');
  
  try {
    // Parse Excel file with options for better data extraction
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to array of arrays with options for better data extraction
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false,
      defval: '',
      blankrows: false
    }) as any[][];
    
    console.log(`Excel data extracted: ${data.length} rows`);
    
    // Process using common function
    return processTeamsAttendanceFile(data);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Teams attendance Excel file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse Excel or CSV file into raw data array
 */
export function parseExcelOrCSV(fileBuffer: Buffer): string[][] {
  try {
    // Try parsing as Excel first
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to array of arrays
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false,
      defval: '',
      blankrows: false
    }) as any[][];
    
    console.log(`Excel data extracted: ${data.length} rows`);
    
    return data;
  } catch (error) {
    console.log('Excel parsing failed, trying CSV formats...');
    
    // Try different encodings for CSV
    const encodings: BufferEncoding[] = ['utf-8', 'utf16le', 'latin1'];
    
    for (const encoding of encodings) {
      try {
        console.log(`Trying CSV parsing with ${encoding} encoding...`);
        const csvString = fileBuffer.toString(encoding);
        
        // Check if the content looks like CSV
        if (csvString.includes(',') || csvString.includes('\t')) {
          const records = csvParse(csvString, {
            skip_empty_lines: true,
            delimiter: csvString.includes('\t') ? '\t' : ','
          });
          
          if (records && records.length > 0) {
            console.log(`CSV parsed successfully with ${encoding} encoding: ${records.length} rows`);
            return records;
          }
        }
      } catch (csvError) {
        console.error(`Failed to parse as CSV with ${encoding} encoding:`, csvError);
      }
    }
    
    // If we get here, all parsing attempts failed
    throw new Error('Failed to parse file as Excel or CSV. Tried multiple encodings.');
  }
}

/**
 * Convert raw binary data to readable text
 * This handles UTF-16 encoded data from Teams attendance exports
 */
function normalizeRawData(rawData: any[][]): string[][] {
  // Check if input is valid
  if (!rawData || !Array.isArray(rawData)) {
    console.error('Invalid input to normalizeRawData:', rawData);
    return [];
  }
  
  // If the data is already in string format, return it as is
  if (rawData.length > 0 && typeof rawData[0][0] === 'string') {
    console.log('Data is already in string format, no normalization needed');
    return rawData as string[][];
  }
  
  console.log('Detected binary data format (UTF-16), converting to text...');
  
  // For UTF-16 encoded data, we need to combine pairs of bytes
  // First, convert the 2D array to a flat array of numbers
  const flatData: number[] = [];
  for (const row of rawData) {
    for (const cell of row) {
      if (typeof cell === 'number') {
        flatData.push(cell);
      }
    }
  }
  
  // Skip BOM (Byte Order Mark) if present
  let startIndex = 0;
  if (flatData[0] === 255 && flatData[1] === 254) {
    startIndex = 2;
  }
  
  // Convert to string (UTF-16LE)
  let text = '';
  for (let i = startIndex; i < flatData.length; i += 2) {
    if (i + 1 < flatData.length) {
      const charCode = flatData[i] + (flatData[i + 1] << 8);
      if (charCode > 0) {
        text += String.fromCharCode(charCode);
      }
    }
  }
  
  console.log('Converted text sample:', text.substring(0, 100));
  
  // Split into rows and cells
  const rows = text.split('\n');
  const normalizedData: string[][] = [];
  
  for (const row of rows) {
    if (row.trim()) {
      const cells = row.split('\t');
      normalizedData.push(cells);
    }
  }
  
  console.log('Normalized data sample:', normalizedData.slice(0, 3));
  return normalizedData;
}

/**
 * Identify different sections in Teams attendance file
 */
export function identifyTeamsFileSections(rawData: any[][]): TeamsFileSections {
  // Ensure we have valid input
  if (!rawData || !Array.isArray(rawData)) {
    console.error('Invalid input to identifyTeamsFileSections:', rawData);
    return {
      meetingInfoSection: [],
      participantsSection: [],
      activitiesSection: []
    };
  }
  
  const normalizedData = normalizeRawData(rawData);
  
  // Initialize section indices
  let meetingInfoStart = -1;
  let participantsStart = -1;
  let activitiesStart = -1;
  let participantsEnd = -1;
  
  // Log the first few rows for debugging
  if (Array.isArray(normalizedData) && normalizedData.length > 0) {
    console.log('First few rows of normalized data:', normalizedData.slice(0, 5));
  } else {
    console.error('Normalized data is not a valid array');
    return {
      meetingInfoSection: [],
      participantsSection: [],
      activitiesSection: []
    };
  }
  
  // Filter out empty rows
  const nonEmptyRows = Array.isArray(normalizedData) ? 
    normalizedData.filter(row => row && Array.isArray(row) && row.length > 0 && row.some(cell => cell && cell.toString().trim() !== '')) : 
    [];
  
  if (nonEmptyRows.length === 0) {
    console.error('No non-empty rows found in the data');
    // Return empty sections as fallback
    return {
      meetingInfoSection: [],
      participantsSection: [],
      activitiesSection: []
    };
  }
  
  console.log('First few non-empty rows:', nonEmptyRows.slice(0, 5));
  
  // Scan for section headers
  for (let i = 0; i < nonEmptyRows.length; i++) {
    const row = nonEmptyRows[i];
    const rowText = row.join(' ').toLowerCase();
    const firstCell = row[0]?.toString().toLowerCase() || '';
    
    // Check for meeting info section or meeting duration
    if (firstCell.includes('summary') || firstCell.includes('meeting') || 
        rowText.includes('meeting title') || rowText.includes('meeting information') ||
        (firstCell === 'meeting duration' || rowText.startsWith('meeting duration'))) {
      meetingInfoStart = i;
      console.log(`Found meeting info section at row ${i}: ${JSON.stringify(row)}`);
      continue;
    }
    
    // Check for participants section - more flexible matching
    if (firstCell.includes('full name') || firstCell.includes('name') || 
        firstCell.includes('participants') || firstCell.match(/^(\d+\.)\s*participants/) ||
        rowText.includes('participant') || rowText.includes('attendee')) {
      // Look ahead a few rows to find the actual header row with columns
      let headerRowIndex = i;
      for (let j = i; j < Math.min(i + 10, nonEmptyRows.length); j++) {
        const potentialHeaderRow = nonEmptyRows[j];
        const headerText = potentialHeaderRow.join(' ').toLowerCase();
        // Make sure it's not just a meeting duration row
        if ((headerText.includes('join') || headerText.includes('email') || 
            headerText.includes('duration') || headerText.includes('role')) &&
            !headerText.startsWith('meeting duration')) {
          headerRowIndex = j;
          console.log(`Found participants header row at ${j}: ${JSON.stringify(potentialHeaderRow)}`);
          break;
        }
      }
      
      participantsStart = headerRowIndex;
      console.log(`Found participants section at row ${i}, header at ${headerRowIndex}`);
      continue;
    }
    
    // Check for activities section - more flexible matching
    if (firstCell.includes('activities') || firstCell.match(/^(\d+\.)\s*activities/) ||
        rowText.includes('activity') || rowText.includes('action')) {
      // Look ahead a few rows to find the actual header row with columns
      let headerRowIndex = i;
      for (let j = i; j < Math.min(i + 10, nonEmptyRows.length); j++) {
        const potentialHeaderRow = nonEmptyRows[j];
        const headerText = potentialHeaderRow.join(' ').toLowerCase();
        if (headerText.includes('action') || headerText.includes('timestamp') || 
            headerText.includes('joined') || headerText.includes('left')) {
          headerRowIndex = j;
          console.log(`Found activities header row at ${j}: ${JSON.stringify(potentialHeaderRow)}`);
          break;
        }
      }
      
      activitiesStart = headerRowIndex;
      participantsEnd = i; // End of participants section is the start of activities
      console.log(`Found activities section at row ${i}, header at ${headerRowIndex}`);
      break;
    }
  }
  
  // If we didn't find the end of participants section, it goes to the end of the file
  if (participantsEnd === -1 && participantsStart !== -1) {
    participantsEnd = nonEmptyRows.length;
  }
  
  console.log(`Section indices - Meeting info: ${meetingInfoStart}, Participants: ${participantsStart}-${participantsEnd}, Activities: ${activitiesStart}`);
  
  // Extract sections
  const meetingInfoSection = meetingInfoStart !== -1 ? 
    nonEmptyRows.slice(meetingInfoStart, participantsStart !== -1 ? participantsStart : nonEmptyRows.length) : [];
  
  const participantsSection = participantsStart !== -1 ? 
    nonEmptyRows.slice(participantsStart, participantsEnd) : [];
  
  const activitiesSection = activitiesStart !== -1 ? 
    nonEmptyRows.slice(activitiesStart) : [];
  
  console.log(`Section lengths - Meeting info: ${meetingInfoSection.length}, Participants: ${participantsSection.length}, Activities: ${activitiesSection.length}`);
  
  // If we couldn't find participants section but have data, try to detect it based on content
  if (participantsSection.length === 0 && nonEmptyRows.length > 0) {
    console.log('No participants section found, trying to detect based on content...');
    
    // Look for rows that might contain participant data (name, email, etc.)
    const potentialParticipantRows = nonEmptyRows.filter(row => {
      const rowText = row.join(' ').toLowerCase();
      return (rowText.includes('@') || rowText.includes('join') || rowText.includes('leave')) && 
             !rowText.includes('meeting title') && !rowText.includes('summary');
    });
    
    if (potentialParticipantRows.length > 0) {
      console.log(`Found ${potentialParticipantRows.length} potential participant rows based on content`);
      return {
        meetingInfoSection: meetingInfoSection.length > 0 ? meetingInfoSection : [],
        participantsSection: potentialParticipantRows,
        activitiesSection: activitiesSection.length > 0 ? activitiesSection : []
      };
    }
  }
  
  return {
    meetingInfoSection,
    participantsSection,
    activitiesSection
  };
}

/**
 * Extract meeting information from the meeting info section
 */
export function extractMeetingInfo(meetingInfoSection: string[][], allData?: string[][]): {
  title: string;
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
} {
  if (!meetingInfoSection || meetingInfoSection.length === 0) {
    return { title: 'Unknown Meeting' };
  }
  
  let title = 'Unknown Meeting';
  let startTime: Date | undefined;
  let endTime: Date | undefined;
  let durationMinutes: number | undefined;
  
  // Look for meeting title and times in the section
  for (const row of meetingInfoSection) {
    if (!row[0]) continue;
    
    const label = row[0].toString().toLowerCase();
    
    if (label.includes('meeting') && label.includes('title') && row[1]) {
      title = row[1].toString().trim();
    } else if (label.includes('start time') && row[1]) {
      startTime = parseTeamsDateTime(row[1].toString());
    } else if (label.includes('end time') && row[1]) {
      endTime = parseTeamsDateTime(row[1].toString());
    } else if (label === 'meeting duration' && row[1]) {
      // Try to extract duration directly if available
      const durationString = row[1].toString().trim();
      durationMinutes = parseDurationToMinutes(durationString);
      console.log(`Found meeting duration in CSV: ${durationString} -> ${durationMinutes} minutes`);
    }
  }
  
  // If we didn't find meeting duration in the meeting info section, look for it in all data
  if (!durationMinutes && allData && allData.length > 0) {
    for (const row of allData) {
      if (row.length >= 2 && row[0]?.toString().toLowerCase() === 'meeting duration') {
        const durationString = row[1].toString().trim();
        durationMinutes = parseDurationToMinutes(durationString);
        console.log(`Found meeting duration in full CSV data: ${durationString} -> ${durationMinutes} minutes`);
        break;
      }
    }
  }
  
  // Calculate duration from start and end times if not directly provided
  if (!durationMinutes && startTime && endTime) {
    durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }
  
  return { title, startTime, endTime, durationMinutes };
}

/**
 * Process participants section to extract participant data
 */
export function processParticipantsSection(participantsSection: string[][]): TeamsParticipant[] {
  if (participantsSection.length <= 1) {
    return []; // Only header or empty
  }
  
  const headerRow = participantsSection[0];
  console.log('Processing participants with header:', headerRow);
  
  const participants: TeamsParticipant[] = [];
  
  // Find column indexes with more flexible matching
  const nameIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('name'));
    
  const emailIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('email'));
    
  const upnIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('participant id') || 
    cell?.toString().toLowerCase().includes('upn'));
    
  const joinTimeIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('join') && 
    cell?.toString().toLowerCase().includes('time'));
    
  const leaveTimeIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('leave') && 
    cell?.toString().toLowerCase().includes('time'));
    
  const durationIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('duration'));
    
  const firstJoinIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('first') && 
    cell?.toString().toLowerCase().includes('join'));
    
  const lastLeaveIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('last') && 
    cell?.toString().toLowerCase().includes('leave'));
    
  const roleIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('role'));
  
  console.log('Column indexes:', { 
    nameIndex, emailIndex, upnIndex, joinTimeIndex, leaveTimeIndex, 
    durationIndex, firstJoinIndex, lastLeaveIndex, roleIndex 
  });
  
  // Process each participant row
  for (let i = 1; i < participantsSection.length; i++) {
    const row = participantsSection[i];
    
    // Skip empty rows or section headers
    if (!row || row.length === 0 || !row[nameIndex]) continue;
    const name = row[nameIndex].toString().trim();
    if (!name || name.startsWith('3.')) continue;
    
    // Skip rows without name or email
    if (!row[nameIndex] || (emailIndex === -1 && upnIndex === -1)) {
      console.log('Skipping row without name or email/upn:', row);
      continue;
    }
    
    // Get email from either email column or UPN column
    let email = '';
    if (emailIndex >= 0 && row[emailIndex]) {
      email = row[emailIndex].toString().trim().toLowerCase();
    } else if (upnIndex >= 0 && row[upnIndex]) {
      email = row[upnIndex].toString().trim().toLowerCase();
    }
    
    if (!email) {
      console.log('Skipping row without email:', row);
      continue;
    }
    
    const participant: TeamsParticipant = {
      name: name,
      email: email,
      joinTime: new Date(0),
      leaveTime: new Date(0),
      durationMinutes: 0
    };
    
    // Add UPN if available
    if (upnIndex >= 0 && row[upnIndex]) {
      participant.upn = row[upnIndex].toString().trim();
    }
    
    // Process join/leave times
    if (firstJoinIndex >= 0 && row[firstJoinIndex]) {
      participant.firstJoin = row[firstJoinIndex].toString().trim();
      participant.joinTime = parseTeamsDateTime(participant.firstJoin);
    } else if (joinTimeIndex >= 0 && row[joinTimeIndex]) {
      const joinTimeStr = row[joinTimeIndex].toString().trim();
      participant.joinTime = parseTeamsDateTime(joinTimeStr);
    }
    
    if (lastLeaveIndex >= 0 && row[lastLeaveIndex]) {
      participant.lastLeave = row[lastLeaveIndex].toString().trim();
      participant.leaveTime = parseTeamsDateTime(participant.lastLeave);
    } else if (leaveTimeIndex >= 0 && row[leaveTimeIndex]) {
      const leaveTimeStr = row[leaveTimeIndex].toString().trim();
      participant.leaveTime = parseTeamsDateTime(leaveTimeStr);
    }
    
    // Process duration
    if (durationIndex >= 0 && row[durationIndex]) {
      participant.inMeetingDuration = row[durationIndex].toString().trim();
      participant.durationMinutes = parseDurationString(participant.inMeetingDuration);
    }
    
    // If we have join and leave times but no duration, calculate it
    if (participant.durationMinutes === 0 && 
        participant.joinTime.getTime() > 0 && 
        participant.leaveTime.getTime() > 0) {
      const durationMs = participant.leaveTime.getTime() - participant.joinTime.getTime();
      participant.durationMinutes = Math.round(durationMs / (1000 * 60));
    }
    
    console.log(`Processed participant: ${participant.name}, email: ${participant.email}, duration: ${participant.durationMinutes} minutes`);
    participants.push(participant);
  }
  
  console.log(`Total participants processed: ${participants.length}`);
  return participants;
}

/**
 * Process activities section to extract detailed join/leave events
 */
export function processActivitiesSection(activitiesSection?: string[][]): TeamsDetailedActivity[] {
  if (!activitiesSection || activitiesSection.length <= 1) {
    return []; // Only header or empty
  }
  
  const headerRow = activitiesSection[0];
  const activities: TeamsDetailedActivity[] = [];
  
  // Find column indexes
  const nameIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('name'));
  const emailIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('email') || 
    cell?.toString().toLowerCase().includes('user id'));
  const actionIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('action'));
  const timestampIndex = headerRow.findIndex(cell => 
    cell?.toString().toLowerCase().includes('timestamp'));
  
  // Process each activity row
  for (let i = 1; i < activitiesSection.length; i++) {
    const row = activitiesSection[i];
    if (!row[nameIndex] || !row[emailIndex] || !row[actionIndex] || !row[timestampIndex]) {
      continue; // Skip incomplete rows
    }
    
    const action = row[actionIndex].toString().trim();
    if (action !== 'Joined' && action !== 'Left') {
      continue; // Skip unknown actions
    }
    
    activities.push({
      name: row[nameIndex].toString().trim(),
      email: row[emailIndex].toString().trim().toLowerCase(),
      action: action as 'Joined' | 'Left',
      timestamp: parseTeamsDateTime(row[timestampIndex].toString())
    });
  }
  
  return activities;
}

/**
 * Calculate detailed duration based on join/leave events
 */
export function calculateDetailedDuration(activities: TeamsDetailedActivity[]): number {
  if (activities.length === 0) return 0;
  
  // Sort activities by timestamp
  const sortedActivities = [...activities].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  let totalDurationMs = 0;
  let lastJoinTime: Date | null = null;
  
  for (const activity of sortedActivities) {
    if (activity.action === 'Joined') {
      lastJoinTime = activity.timestamp;
    } else if (activity.action === 'Left' && lastJoinTime) {
      // Calculate duration for this join-leave pair
      const durationMs = activity.timestamp.getTime() - lastJoinTime.getTime();
      totalDurationMs += durationMs;
      lastJoinTime = null;
    }
  }
  
  // Convert milliseconds to minutes
  return Math.round(totalDurationMs / (1000 * 60));
}

/**
 * Parse duration string into minutes
 * Handles formats like "1h 30m", "90 minutes", "1.5 hours", etc.
 */
export function parseDurationToMinutes(durationString: string): number | undefined {
  if (!durationString) return undefined;
  
  // Clean up the string
  const cleanString = durationString.toLowerCase().trim();
  console.log(`Parsing duration string: ${cleanString}`);
  
  // Format: "45m 7s" - specific format from Teams CSV
  const minuteSecondRegex = /(\d+)\s*m\s*(\d+)\s*s/i;
  const minuteSecondMatch = cleanString.match(minuteSecondRegex);
  
  if (minuteSecondMatch) {
    const minutes = parseInt(minuteSecondMatch[1], 10);
    const seconds = parseInt(minuteSecondMatch[2], 10);
    const totalMinutes = minutes + Math.round(seconds / 60);
    console.log(`Parsed duration: ${cleanString} -> ${totalMinutes} minutes`);
    return totalMinutes;
  }
  
  // Format: "1h 30m" or "1 hour 30 minutes"
  const hourMinuteRegex = /(?:(\d+)\s*h(?:our)?s?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?/i;
  const hourMinuteMatch = cleanString.match(hourMinuteRegex);
  
  if (hourMinuteMatch && (hourMinuteMatch[1] || hourMinuteMatch[2])) {
    const hours = hourMinuteMatch[1] ? parseInt(hourMinuteMatch[1], 10) : 0;
    const minutes = hourMinuteMatch[2] ? parseInt(hourMinuteMatch[2], 10) : 0;
    const totalMinutes = hours * 60 + minutes;
    console.log(`Parsed duration: ${cleanString} -> ${totalMinutes} minutes`);
    return totalMinutes;
  }
  
  // Format: "90 minutes"
  const minutesOnlyRegex = /(\d+)\s*m(?:in(?:ute)?s?)?$/i;
  const minutesOnlyMatch = cleanString.match(minutesOnlyRegex);
  
  if (minutesOnlyMatch) {
    const minutes = parseInt(minutesOnlyMatch[1], 10);
    console.log(`Parsed duration: ${cleanString} -> ${minutes} minutes`);
    return minutes;
  }
  
  // Format: "1.5 hours"
  const decimalHoursRegex = /(\d+(?:\.\d+)?)\s*h(?:our)?s?$/i;
  const decimalHoursMatch = cleanString.match(decimalHoursRegex);
  
  if (decimalHoursMatch) {
    const totalMinutes = Math.round(parseFloat(decimalHoursMatch[1]) * 60);
    console.log(`Parsed duration: ${cleanString} -> ${totalMinutes} minutes`);
    return totalMinutes;
  }
  
  // If all else fails, try to extract any number
  const anyNumberRegex = /(\d+(?:\.\d+)?)/;
  const anyNumberMatch = cleanString.match(anyNumberRegex);
  
  if (anyNumberMatch) {
    // Assume minutes if the number is large, hours if small
    const value = parseFloat(anyNumberMatch[1]);
    const totalMinutes = value > 10 ? value : Math.round(value * 60);
    console.log(`Parsed duration: ${cleanString} -> ${totalMinutes} minutes`);
    return totalMinutes;
  }
  
  console.log(`Could not parse duration: ${cleanString}`);
  return undefined;
}

/**
 * Parse Teams date/time format to JavaScript Date
 * Handles formats like "5/15/2023, 10:00:00 AM" or "15/05/2023, 10:00:00"
 */
export function parseTeamsDateTime(dateTimeString: string): Date {
  if (!dateTimeString) return new Date(0);
  
  try {
    // Try direct parsing first
    const date = new Date(dateTimeString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Handle various date formats
    // Format: MM/DD/YYYY, HH:MM:SS AM/PM or DD/MM/YYYY, HH:MM:SS
    const dateTimeParts = dateTimeString.split(',');
    if (dateTimeParts.length !== 2) {
      throw new Error(`Invalid date format: ${dateTimeString}`);
    }
    
    const datePart = dateTimeParts[0].trim();
    const timePart = dateTimeParts[1].trim();
    
    // Parse date part
    let day: number, month: number, year: number;
    const dateSplit = datePart.split('/');
    
    if (dateSplit.length !== 3) {
      throw new Error(`Invalid date format: ${datePart}`);
    }
    
    // Check if first part is month or day (based on value)
    const firstNum = parseInt(dateSplit[0], 10);
    const secondNum = parseInt(dateSplit[1], 10);
    
    if (firstNum > 12) {
      // Format is DD/MM/YYYY
      day = firstNum;
      month = secondNum;
    } else {
      // Format is MM/DD/YYYY
      month = firstNum;
      day = secondNum;
    }
    
    year = parseInt(dateSplit[2], 10);
    
    // Parse time part
    let hours = 0, minutes = 0, seconds = 0;
    const isPM = timePart.toLowerCase().includes('pm');
    
    const timeMatch = timePart.match(/(\d+):(\d+)(?::(\d+))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      
      // Adjust for PM
      if (isPM && hours < 12) {
        hours += 12;
      }
      // Adjust for 12 AM
      if (!isPM && hours === 12) {
        hours = 0;
      }
    }
    
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error(`Error parsing date: ${dateTimeString}`, error);
    return new Date(0);
  }
}

/**
 * Parse duration string format (e.g., "1h 23m 45s" or "24m 24s") to minutes
 */
export function parseDurationString(durationString?: string): number {
  if (!durationString) return 0;
  
  console.log('Parsing duration string:', durationString);
  let totalMinutes = 0;
  
  // Handle format like "24m 24s"
  const hourMatch = durationString.match(/(\d+)\s*h/);
  const minuteMatch = durationString.match(/(\d+)\s*m/);
  const secondMatch = durationString.match(/(\d+)\s*s/);
  
  // Add hours
  if (hourMatch && hourMatch[1]) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  
  // Add minutes
  if (minuteMatch && minuteMatch[1]) {
    totalMinutes += parseInt(minuteMatch[1], 10);
  }
  
  // Add seconds (rounded to nearest minute)
  if (secondMatch && secondMatch[1]) {
    const seconds = parseInt(secondMatch[1], 10);
    if (seconds >= 30) totalMinutes += 1;
  }
  
  // If no matches found, try alternative format like "HH:MM:SS"
  if (totalMinutes === 0 && durationString.includes(':')) {
    const parts = durationString.split(':');
    if (parts.length === 3) {
      // Format: HH:MM:SS
      totalMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      const seconds = parseInt(parts[2], 10);
      if (seconds >= 30) totalMinutes += 1;
    } else if (parts.length === 2) {
      // Format: MM:SS
      totalMinutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (seconds >= 30) totalMinutes += 1;
    }
  }
  
  console.log(`Parsed duration: ${durationString} -> ${totalMinutes} minutes`);
  return totalMinutes;
}

/**
 * Process Teams attendance file and extract structured data
 */
export function processTeamsAttendanceFile(rawData: string[][]): TeamsAttendanceData {
  try {
    // Validate input
    if (!rawData || !Array.isArray(rawData)) {
      console.error('Invalid input to processTeamsAttendanceFile:', typeof rawData);
      return {
        meetingTitle: 'Unknown Meeting',
        meetingStartTime: new Date(),
        meetingEndTime: new Date(),
        participants: [],
        detailedActivities: [],
        meetingInfo: {
          title: 'Unknown Meeting',
          startTime: new Date(),
          endTime: new Date(),
          durationMinutes: 60 // Default duration
        }
      };
    }
    
    // Identify sections
    const sections = identifyTeamsFileSections(rawData);
    
    // Extract meeting info - pass both the meeting info section and the full data
    const meetingInfo = extractMeetingInfo(sections.meetingInfoSection, rawData);
    
    // Process participants
    const participants = Array.isArray(sections.participantsSection) ? 
      processParticipantsSection(sections.participantsSection) : [];
    
    // Process detailed activities
    const detailedActivities = Array.isArray(sections.activitiesSection) && sections.activitiesSection.length > 0 ? 
      processActivitiesSection(sections.activitiesSection) : [];
    
    console.log(`Parsed attendance data: ${participants.length} participants found`);
    
    return {
      meetingTitle: meetingInfo.title || 'Unknown Meeting',
      meetingStartTime: meetingInfo.startTime || new Date(),
      meetingEndTime: meetingInfo.endTime || new Date(),
      participants,
      detailedActivities,
      meetingInfo: {
        title: meetingInfo.title || 'Unknown Meeting',
        startTime: meetingInfo.startTime || new Date(),
        endTime: meetingInfo.endTime || new Date(),
        durationMinutes: meetingInfo.durationMinutes || 60, // Always include duration, default to 60 if not found
        organizer: '' // Could be extracted from meeting info if available
      }
    };
  } catch (error) {
    console.error('Error processing Teams attendance file:', error);
    return {
      meetingTitle: 'Error Processing File',
      meetingStartTime: new Date(),
      meetingEndTime: new Date(),
      participants: [],
      detailedActivities: [],
      meetingInfo: {
        title: 'Error Processing File',
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60 // Default duration
      }
    };
  }
}
