import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

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
      from: 'CME Webinars <onboarding@resend.dev>', // Using Resend's test domain
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
          background-color: #4f46e5;
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
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .webinar-title {
          color: #4f46e5;
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
          background-color: #4f46e5;
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
