# Certificate System Documentation

## Overview

The Certificate System allows users who have completed webinars and had their attendance approved to download PDF certificates. These certificates serve as proof of completion and can be verified using a QR code or certificate number.

## Features

- **Automatic Certificate Generation**: Certificates are automatically generated when attendance is approved
- **PDF Certificate Download**: Users can download their certificates as PDF files
- **Certificate Verification**: Anyone can verify a certificate using the QR code or certificate number
- **Certificate Management**: Users can view all their certificates in one place

## Database Schema

The system uses a `certificates` table with the following structure:

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES sessions(id),
  attendance_id UUID REFERENCES session_attendance(id),
  certificate_number TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  downloaded_at TIMESTAMPTZ
);
```

## How It Works

1. **Certificate Generation**:
   - When a user's attendance is approved, a trigger automatically generates a certificate
   - Each certificate has a unique certificate number formatted as `CERT-{sessionId}-{userId}-{timestamp}`

2. **Certificate Download**:
   - Users can download their certificates from:
     - The webinar detail page (if they have an approved attendance)
     - Their certificates dashboard
   - Downloads are tracked in the `downloaded_at` field

3. **Certificate Verification**:
   - Each certificate includes a QR code that links to a verification page
   - Anyone can verify a certificate by scanning the QR code or entering the certificate number on the verification page

## User Interface

- **Certificate Dashboard**: Users can view and download all their certificates
- **Webinar Detail Page**: Shows a "Download Certificate" button if the user has an approved attendance
- **Verification Page**: Allows anyone to verify a certificate by entering the certificate number

## API Endpoints

- `POST /api/certificates/generate`: Generates a certificate for a given attendance ID
- `GET /api/certificates/download`: Downloads a certificate PDF by certificate ID
- `GET /api/certificates/verify`: Verifies a certificate by certificate number
- `GET /api/certificates/check`: Checks if a user has a certificate for a specific session

## Implementation Details

- PDF generation is handled by `jsPDF` and `jspdf-autotable`
- QR codes are generated using `qrcode`
- Certificate verification uses a public page that doesn't require authentication

## How to Apply the Migration

**IMPORTANT**: The migration file has been created but not yet applied. To apply the migration:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the file `supabase/migrations/20250603_certificate_system.sql`
4. Run the SQL script in the Supabase SQL Editor

Alternatively, if you're using the Supabase CLI:

```bash
supabase db push
```

## Testing the System

To test the certificate system:

1. Approve a user's attendance for a webinar
2. Verify that a certificate is automatically generated
3. Have the user download the certificate from their dashboard or the webinar detail page
4. Scan the QR code on the certificate to verify it
