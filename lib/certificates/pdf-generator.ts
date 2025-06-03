import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { format } from 'date-fns';

type CertificateData = {
  certificateNumber: string;
  userName: string;
  sessionTitle: string;
  sessionDate: string;
  issuedDate: string;
  verificationUrl: string;
};

export async function generateCertificatePdf(
  data: CertificateData
): Promise<Uint8Array> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Set document properties
  doc.setProperties({
    title: `Certificate of Completion - ${data.sessionTitle}`,
    subject: 'Certificate of Completion',
    author: 'CME Platform',
    keywords: 'certificate, webinar, completion',
    creator: 'CME Platform'
  });

  // Add background color/design
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, 297, 210, 'F');

  // Add border
  doc.setDrawColor(0, 123, 255);
  doc.setLineWidth(1);
  doc.rect(10, 10, 277, 190);

  // Add header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(44, 62, 80);
  doc.text('CERTIFICATE OF COMPLETION', 148.5, 40, { align: 'center' });

  // Add logo placeholder (you would replace this with your actual logo)
  // doc.addImage(logoBase64, 'PNG', 124, 20, 50, 15);

  // Add recipient name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(52, 73, 94);
  doc.text(`${data.userName}`, 148.5, 80, { align: 'center' });

  // Add certificate text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text(
    'has successfully completed the following webinar:',
    148.5,
    95,
    { align: 'center' }
  );

  // Add course name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text(`"${data.sessionTitle}"`, 148.5, 110, { align: 'center' });

  // Add date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(52, 73, 94);
  doc.text(`Completed on: ${data.sessionDate}`, 148.5, 125, {
    align: 'center'
  });

  // Add certificate number
  doc.setFontSize(10);
  doc.text(`Certificate Number: ${data.certificateNumber}`, 148.5, 140, {
    align: 'center'
  });

  // Add issue date
  doc.text(`Issued on: ${data.issuedDate}`, 148.5, 145, { align: 'center' });

  // Generate QR code for verification
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      margin: 1,
      width: 100
    });
    doc.addImage(qrCodeDataUrl, 'PNG', 20, 150, 30, 30);
    doc.setFontSize(8);
    doc.text('Scan to verify', 35, 185, { align: 'center' });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  // Add signature placeholder
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(198.5, 160, 248.5, 160);
  doc.setFontSize(12);
  doc.text('Authorized Signature', 223.5, 165, { align: 'center' });

  // Add footer
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141);
  doc.text(
    'This certificate verifies completion of the above mentioned webinar.',
    148.5,
    180,
    { align: 'center' }
  );

  // Convert the PDF to an array buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(pdfArrayBuffer);
}

export function formatCertificateData({
  certificate,
  user,
  session,
  baseUrl
}: {
  certificate: {
    id: string;
    certificate_number: string;
    issued_at: string;
  };
  user: {
    full_name: string;
  };
  session: {
    title: string;
    start_time: string;
  };
  baseUrl: string;
}): CertificateData {
  const userName = user.full_name;
  const sessionDate = format(new Date(session.start_time), 'MMMM dd, yyyy');
  const issuedDate = format(new Date(certificate.issued_at), 'MMMM dd, yyyy');
  const verificationUrl = `${baseUrl}/verify/${certificate.certificate_number}`;

  return {
    certificateNumber: certificate.certificate_number,
    userName,
    sessionTitle: session.title,
    sessionDate,
    issuedDate,
    verificationUrl
  };
}
