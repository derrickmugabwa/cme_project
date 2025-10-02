# Email Integration Documentation

## Overview

This project uses [Resend](https://resend.com) to send transactional emails to users. Currently, emails are sent for:

1. Webinar enrollment confirmations
2. Session reminder emails (automated via Inngest)

## Setup

### 1. Sign up for Resend
Go to https://resend.com and create an account

### 2. Get Your API Key
1. Navigate to API Keys in your Resend dashboard
2. Create a new API key
3. Copy the key (it will only be shown once)

### 3. Verify Your Domain
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the provided DNS records to your domain:
   - SPF Record (TXT)
   - DKIM Record (TXT)
   - MX Record (optional)
5. Wait for verification (usually within minutes, can take up to 48 hours)

### 4. Configure Environment Variables
Add these to your `.env.local` file:

```env
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# Email Sender Configuration (use your verified domain)
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=CME Webinars
```

**Common sender addresses:**
- `noreply@yourdomain.com` - Standard for automated emails
- `notifications@yourdomain.com` - For notification emails
- `support@yourdomain.com` - If you want users to reply
- `webinars@yourdomain.com` - Specific to webinar platform

## Email Templates

Email templates are currently defined as HTML strings in the `services/email.ts` file. Each email type has its own template function:

- `generateEnrollmentEmailHtml`: Creates the HTML for webinar enrollment confirmation emails

## Implementation

### Webinar Enrollment Emails

When a user successfully enrolls in a webinar, an email is automatically sent with:
- Webinar title and description
- Date and time information
- Speaker details
- Location (if applicable)

The email sending is handled in the enrollment API endpoint (`app/api/sessions/[id]/enroll/route.ts`).

## Adding New Email Types

To add a new type of email:

1. Create a new template function in `services/email.ts`
2. Create a new send function in `services/email.ts`
3. Call the send function from the appropriate API endpoint or server action

## Testing

For testing emails during development:
- Use Resend's test email address: `delivered@resend.dev`
- Check the Resend dashboard to see sent emails and their delivery status

## Troubleshooting

If emails are not being sent:
1. Check that the `RESEND_API_KEY` is correctly set in your `.env` file
2. Verify that the sender email is from a domain you've verified in Resend
3. Check the server logs for any error messages
4. Check the Resend dashboard for failed deliveries
