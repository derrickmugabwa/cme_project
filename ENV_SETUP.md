# Environment Variables Setup Guide

## Required Environment Variables

Add these variables to your `.env.local` file:

### Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Resend Email Configuration
```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_your_api_key_here

# Email Sender Configuration
# Use your verified domain email address
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=CME Webinars

# Example configurations:
# EMAIL_FROM_ADDRESS=notifications@yourdomain.com
# EMAIL_FROM_NAME=Your Platform Name
```

### Other Configuration
```env
NODE_ENV=development  # Change to 'production' when deploying
```

## Setting Up Your Custom Domain with Resend

### Step 1: Sign up for Resend
1. Go to https://resend.com
2. Create an account or sign in
3. Navigate to the API Keys section

### Step 2: Verify Your Domain
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records provided by Resend to your domain's DNS settings:
   - **SPF Record** (TXT): Authorizes Resend to send emails
   - **DKIM Record** (TXT): Authenticates your emails
   - **MX Record** (optional): For receiving bounce notifications

### Step 3: Wait for Verification
- DNS propagation can take up to 48 hours (usually much faster)
- Resend will automatically verify your domain once DNS records are detected
- You'll receive a confirmation email when verification is complete

### Step 4: Update Environment Variables
Once your domain is verified, update your `.env.local`:

```env
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=CME Webinars
```

### Step 5: Test Your Configuration
You can test your email configuration by:
1. Enrolling in a test session
2. Checking the Resend dashboard for sent emails
3. Verifying emails arrive in your inbox

## Common Email Addresses

Choose an appropriate sender address for your domain:

- `noreply@yourdomain.com` - Standard for automated emails
- `notifications@yourdomain.com` - For notification emails
- `support@yourdomain.com` - If you want users to reply
- `webinars@yourdomain.com` - Specific to webinar platform
- `cme@yourdomain.com` - Specific to CME platform

## Production Checklist

Before going to production:

- [ ] Domain verified in Resend
- [ ] DNS records properly configured
- [ ] `EMAIL_FROM_ADDRESS` set to your verified domain
- [ ] `EMAIL_FROM_NAME` set to your brand name
- [ ] `RESEND_API_KEY` is valid and has appropriate limits
- [ ] `NODE_ENV=production` set in production environment
- [ ] Test emails sent successfully
- [ ] Check Resend rate limits match your expected volume

## Rate Limits

### Resend Free Tier
- 100 emails per day
- 3,000 emails per month

### Resend Pro Tier
- 50,000 emails per month
- Higher rate limits

**Note**: The platform includes automatic rate limiting and batching to respect these limits.

## Troubleshooting

### Emails not sending
1. Verify `RESEND_API_KEY` is correct
2. Check domain is verified in Resend dashboard
3. Ensure `EMAIL_FROM_ADDRESS` uses your verified domain
4. Check Resend dashboard for error logs

### Emails going to spam
1. Ensure all DNS records (SPF, DKIM) are properly configured
2. Add DMARC record to your domain
3. Warm up your domain by sending gradually increasing volumes
4. Avoid spam trigger words in subject lines

### Domain verification issues
1. Double-check DNS records match exactly what Resend provides
2. Wait for DNS propagation (can take up to 48 hours)
3. Use DNS checker tools to verify records are live
4. Contact Resend support if issues persist
