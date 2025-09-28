import { NextRequest, NextResponse } from 'next/server';
import { generateCertificatePdf } from '@/lib/certificates/pdf-generator';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Parse request body to get template ID if provided
    let templateId: string | undefined;
    try {
      const body = await request.json();
      templateId = body.templateId;
    } catch (e) {
      // No body or invalid JSON, proceed with default template
    }

    // Generate sample certificate data
    const sampleData = {
      certificateNumber: 'SAMPLE-12345',
      userName: 'John Doe',
      sessionTitle: 'Advanced Medical Training',
      sessionDate: format(new Date(), 'yyyy-MM-dd'),
      issuedDate: format(new Date(), 'yyyy-MM-dd'),
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/SAMPLE-12345`,
      location: 'Nairobi, Kenya',
      standardReference: 'ISO 9001:2015',
      trainingType: 'Continuing Medical Education',
      topic: 'Clinical Laboratory Quality Management', // Add sample topic
      signatories: [
        {
          name: 'Dr. Jane Smith',
          title: 'Medical Director'
        },
        {
          name: 'Prof. Robert Johnson',
          title: 'Program Coordinator'
        }
      ],
      templateId // Add the template ID to the certificate data
    };

    // Generate the PDF with the specified template
    const pdfBytes = await generateCertificatePdf(sampleData);

    // Return the PDF as a downloadable file
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sample-certificate.pdf"'
      }
    });
  } catch (error) {
    console.error('Error generating sample certificate:', error);
    return NextResponse.json(
      { error: 'Failed to generate sample certificate' },
      { status: 500 }
    );
  }
}
