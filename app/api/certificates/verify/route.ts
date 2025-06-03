import { createClient } from '@/lib/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get certificate number from URL
    const certificateNumber = request.nextUrl.searchParams.get('id');
    if (!certificateNumber) {
      return NextResponse.json(
        { error: 'Certificate number is required' },
        { status: 400 }
      );
    }
    
    // Verify the certificate using the database function
    const { data, error } = await supabase.rpc(
      'verify_certificate',
      { p_certificate_number: certificateNumber }
    );
    
    if (error) {
      console.error('Error verifying certificate:', error);
      return NextResponse.json(
        { error: 'Failed to verify certificate' },
        { status: 500 }
      );
    }
    
    // The function returns a table, so data is an array
    const verificationResult = data[0];
    
    if (!verificationResult || !verificationResult.is_valid) {
      return NextResponse.json({
        valid: false,
        message: 'Certificate is not valid or does not exist'
      });
    }
    
    return NextResponse.json({
      valid: true,
      certificate: {
        id: verificationResult.certificate_id,
        userFullName: verificationResult.user_full_name,
        sessionTitle: verificationResult.session_title,
        issuedAt: verificationResult.issued_at
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
