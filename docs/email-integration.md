# Email Integration Documentation

## Overview

This project uses [Resend](https://resend.com) to send transactional emails to users. Currently, emails are sent for:

1. Webinar enrollment confirmations

## Setup

1. Sign up for a Resend account at https://resend.com
2. Create an API key in your Resend dashboard
3. Add the API key to your `.env` file:
   ```
   RESEND_API_KEY=your_resend_api_key_here
   ```
4. For production, verify your domain in Resend
5. Update the sender email in `services/email.ts` to use your verified domain

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
