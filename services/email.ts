import { Resend } from 'resend';
import { SessionReminderDetails, EmailSendResult } from '@/lib/types/reminder-types';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration from environment variables
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'CME Webinars';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
const EMAIL_FROM = `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`;

/**
 * Interface for webinar details
 */
export interface WebinarDetails {
  id: string;
  title: string;
  date: Date | string;
  startTime?: string;
  endTime?: string;
  speakerName: string;
  duration: number;
  location?: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Send enrollment confirmation email to user
 */
// The verified email address for testing
const VERIFIED_TEST_EMAIL = 'deriquemugabwa@gmail.com';

export async function sendEnrollmentConfirmation(
  userEmail: string, 
  userName: string,
  webinarDetails: WebinarDetails
) {
  console.log(`Attempting to send enrollment confirmation email to ${userEmail} for webinar: ${webinarDetails.title}`);
  
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured in environment variables');
      return { success: false, error: 'API key not configured' };
    }
    
    // In development/testing, we'll send all emails to the verified test email
    // In production, you would remove this and send to the actual user email
    const recipientEmail = process.env.NODE_ENV === 'production' ? userEmail : VERIFIED_TEST_EMAIL;
    
    // Add a note in the subject if we're redirecting the email
    const subjectPrefix = recipientEmail !== userEmail ? `[Originally for: ${userEmail}] ` : '';
    
    console.log(`Sending email via Resend to ${recipientEmail}...`);
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [recipientEmail],
      subject: `${subjectPrefix}Enrollment Confirmation: ${webinarDetails.title}`,
      html: generateEnrollmentEmailHtml(userName, webinarDetails),
    });

    if (error) {
      console.error('Email sending failed:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully!', {
      emailId: data?.id,
      recipient: userEmail,
      webinar: webinarDetails.title
    });
    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
}

/**
 * Generate HTML content for enrollment confirmation email
 */
function generateEnrollmentEmailHtml(userName: string, webinarDetails: WebinarDetails) {
  // Format date
  const formattedDate = typeof webinarDetails.date === 'string' 
    ? new Date(webinarDetails.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : webinarDetails.date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  // Time display
  const timeDisplay = webinarDetails.startTime && webinarDetails.endTime 
    ? `${webinarDetails.startTime} - ${webinarDetails.endTime}`
    : `Duration: ${webinarDetails.duration} minutes`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Webinar Enrollment Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #008C45 0%, #006633 100%);
          padding: 20px;
          color: white;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
        }
        .webinar-details {
          background-color: #f0fdf9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #008C45;
        }
        .webinar-title {
          color: #008C45;
          margin-top: 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #6b7280;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #008C45 0%, #006633 100%);
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Webinar Enrollment Confirmation</h1>
      </div>
      <div class="content">
        <p>Hello ${userName},</p>
        <p>Thank you for enrolling in our upcoming webinar. Your registration has been confirmed.</p>
        
        <div class="webinar-details">
          <h2 class="webinar-title">${webinarDetails.title}</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${timeDisplay}</p>
          <p><strong>Speaker:</strong> ${webinarDetails.speakerName}</p>
          ${webinarDetails.location ? `<p><strong>Location:</strong> ${webinarDetails.location}</p>` : ''}
          ${webinarDetails.description ? `<p><strong>Description:</strong> ${webinarDetails.description}</p>` : ''}
        </div>
        
        <p>We look forward to your participation. You will receive a reminder email closer to the event date.</p>
        
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>CME Webinars Team</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CME Webinars. All rights reserved.</p>
        <p>This email was sent to you because you enrolled in a webinar on our platform.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send session reminder email to user with rate limit handling
 */
export async function sendSessionReminder(
  userEmail: string,
  userName: string,
  sessionDetails: SessionReminderDetails
): Promise<EmailSendResult> {
  console.log(`Sending ${sessionDetails.reminderType} reminder to ${userEmail} for session: ${sessionDetails.title}`);
  
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured', shouldRetry: false };
    }
    
    const recipientEmail = process.env.NODE_ENV === 'production' ? userEmail : VERIFIED_TEST_EMAIL;
    const subjectPrefix = recipientEmail !== userEmail ? `[Originally for: ${userEmail}] ` : '';
    
    // Use template from configuration
    const subject = sessionDetails.reminderConfig.email_subject_template
      .replace('{session_title}', sessionDetails.title);
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [recipientEmail],
      subject: `${subjectPrefix}${subject}`,
      html: generateReminderEmailHtml(userName, sessionDetails),
    });

    if (error) {
      // Check if it's a rate limit error
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error 
        ? (error as any).message : String(error);
      const errorStatus = typeof error === 'object' && error !== null && 'status' in error 
        ? (error as any).status : null;
        
      const isRateLimit = errorMessage?.includes('rate limit') || 
                         errorMessage?.includes('too many requests') ||
                         errorStatus === 429;
      
      return { 
        success: false, 
        error, 
        shouldRetry: isRateLimit // Retry rate limit errors, not other errors
      };
    }

    return { success: true, data };
  } catch (error: unknown) {
    // Network errors should be retried
    const errorCode = typeof error === 'object' && error !== null && 'code' in error 
      ? (error as any).code : null;
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error 
      ? (error as any).message : String(error);
      
    const shouldRetry = errorCode === 'ECONNRESET' || 
                       errorCode === 'ETIMEDOUT' ||
                       errorMessage?.includes('network');
    
    return { success: false, error, shouldRetry };
  }
}

/**
 * Generate HTML content for session reminder emails
 */
function generateReminderEmailHtml(userName: string, sessionDetails: SessionReminderDetails): string {
  // Format date
  const formattedDate = typeof sessionDetails.date === 'string' 
    ? new Date(sessionDetails.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : sessionDetails.date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  // Time display
  const timeDisplay = sessionDetails.startTime && sessionDetails.endTime 
    ? `${sessionDetails.startTime} - ${sessionDetails.endTime}`
    : `Duration: ${sessionDetails.duration} minutes`;

  // Get urgency level and styling based on reminder type
  const urgencyLevel = getUrgencyLevel(sessionDetails.reminderConfig.minutes_before);
  const timeUntilSession = getTimeUntilSession(sessionDetails.reminderConfig.minutes_before);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Session Reminder</title>
      <style>
        ${getEmailStyles(urgencyLevel)}
      </style>
    </head>
    <body>
      <div class="header ${urgencyLevel}">
        <h1>${getHeaderText(sessionDetails.reminderConfig.minutes_before)}</h1>
      </div>
      <div class="content">
        <p>Hello ${userName},</p>
        <p>${getReminderMessage(sessionDetails.reminderConfig.minutes_before, sessionDetails.title)}</p>
        
        <div class="session-details">
          <h2 class="session-title">${sessionDetails.title}</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${timeDisplay}</p>
          <p><strong>Speaker:</strong> ${sessionDetails.speakerName || 'Session Speaker'}</p>
          ${sessionDetails.location ? `<p><strong>Location:</strong> ${sessionDetails.location}</p>` : ''}
          ${sessionDetails.description ? `<p><strong>Description:</strong> ${sessionDetails.description}</p>` : ''}
        </div>
        
        ${getCallToAction(sessionDetails.reminderConfig.minutes_before, sessionDetails.joinUrl)}
        
        <p>Best regards,<br>CME Webinars Team</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CME Webinars. All rights reserved.</p>
        <p>This reminder was sent because you enrolled in this session.</p>
      </div>
    </body>
    </html>
  `;
}

// Helper functions for reminder email styling and content
function getUrgencyLevel(minutesBefore: number): string {
  if (minutesBefore <= 30) return 'urgent';
  if (minutesBefore <= 120) return 'soon';
  return 'advance';
}

function getTimeUntilSession(minutesBefore: number): string {
  if (minutesBefore < 60) return `${minutesBefore} minutes`;
  if (minutesBefore < 1440) return `${Math.floor(minutesBefore / 60)} hours`;
  return `${Math.floor(minutesBefore / 1440)} days`;
}

function getHeaderText(minutesBefore: number): string {
  if (minutesBefore <= 30) return 'Session Starting Soon!';
  if (minutesBefore <= 120) return 'Session Reminder';
  return 'Upcoming Session Reminder';
}

function getReminderMessage(minutesBefore: number, sessionTitle: string): string {
  if (minutesBefore <= 30) {
    return `Your session "<strong>${sessionTitle}</strong>" is starting in ${minutesBefore} minutes. Please join now!`;
  }
  if (minutesBefore <= 120) {
    return `Your session "<strong>${sessionTitle}</strong>" is starting in ${Math.floor(minutesBefore / 60)} hours. Get ready to join!`;
  }
  return `This is a friendly reminder that you have an upcoming session "<strong>${sessionTitle}</strong>" in ${getTimeUntilSession(minutesBefore)}.`;
}

function getCallToAction(minutesBefore: number, joinUrl?: string): string {
  if (minutesBefore <= 30 && joinUrl) {
    return `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${joinUrl}" class="button urgent">Join Session Now</a>
      </div>
    `;
  }
  if (minutesBefore <= 120 && joinUrl) {
    return `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${joinUrl}" class="button">Join Session</a>
      </div>
    `;
  }
  return `
    <p>Please mark your calendar and prepare for the session. You'll receive another reminder closer to the start time.</p>
  `;
}

function getEmailStyles(urgencyLevel: string): string {
  const baseColor = urgencyLevel === 'urgent' ? '#dc2626' : 
                   urgencyLevel === 'soon' ? '#f59e0b' : '#008C45';
  const gradientEnd = urgencyLevel === 'urgent' ? '#b91c1c' : 
                      urgencyLevel === 'soon' ? '#d97706' : '#006633';
  
  return `
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      padding: 20px;
      color: white;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .header.urgent {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    }
    .header.soon {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .header.advance {
      background: linear-gradient(135deg, #008C45 0%, #006633 100%);
    }
    .content {
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 5px 5px;
    }
    .session-details {
      background-color: #f0fdf9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid ${baseColor};
    }
    .session-title {
      color: ${baseColor};
      margin-top: 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, ${baseColor} 0%, ${gradientEnd} 100%);
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 5px;
      margin-top: 15px;
      font-weight: bold;
    }
    .button.urgent {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `;
}
