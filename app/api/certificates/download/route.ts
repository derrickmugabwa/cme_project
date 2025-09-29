import { createClient } from '@/lib/server';
import { generateCertificatePdf, formatCertificateData } from '@/lib/certificates/pdf-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get certificate ID from URL
    const certificateId = request.nextUrl.searchParams.get('id');
    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the certificate
    const { data: certificate, error: fetchError } = await supabase
      .from('certificates')
      .select(`
        *,
        profiles:user_id(id, full_name, email),
        sessions:session_id(id, title, start_time, end_time, topic)
      `)
      .eq('id', certificateId)
      .single();
    
    if (fetchError || !certificate) {
      console.error('Error fetching certificate:', fetchError);
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }
    
    // Check if the certificate belongs to the current user
    if (certificate.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to download this certificate' },
        { status: 403 }
      );
    }
    
    // Record the download
    const { error: recordError } = await supabase.rpc(
      'record_certificate_download',
      { p_certificate_id: certificateId }
    );
    
    if (recordError) {
      console.error('Error recording certificate download:', recordError);
      // Continue anyway, this is not critical
    }
    
    // Format certificate data
    const baseUrl = new URL(request.url).origin;
    
    // Get session location if available
    const { data: sessionLocation } = await supabase
      .from('sessions')
      .select('location')
      .eq('id', certificate.session_id)
      .single();
    
    // Default signatories
    const signatories = [
      {
        name: 'Richard Barasa',
        title: 'QA Manager Int\'l Bv & Lead Trainer'
      },
      {
        name: 'Daniel Obara',
        title: 'SBU HR - International Business'
      }
    ];
    
    const certificateData = formatCertificateData({
      certificate: {
        id: certificate.id,
        certificate_number: certificate.certificate_number,
        issued_at: certificate.issued_at
      },
      user: {
        full_name: certificate.profiles.full_name
      },
      session: {
        title: certificate.sessions.title,
        start_time: certificate.sessions.start_time,
        topic: certificate.sessions.topic
      },
      baseUrl,
      location: sessionLocation?.location,
      signatories
    });
    
    // Generate PDF
    const pdfBytes = await generateCertificatePdf(certificateData);
    
    // Return PDF as download
    const fileName = `Certificate_${certificate.certificate_number}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error downloading certificate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
