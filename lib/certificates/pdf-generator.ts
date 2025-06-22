import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { createClient } from '@/lib/client';

type CertificateData = {
  certificateNumber: string;
  userName: string;
  sessionTitle: string;
  sessionDate: string;
  issuedDate: string;
  verificationUrl: string;
  location?: string;
  trainingType?: string;
  signatories?: {
    name: string;
    title: string;
  }[];
  templateId?: string; // Optional template ID to use
};

type CertificateTemplate = {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  completion_text: string;
  quality_text: string;
  title_font: string;
  title_font_style: string;
  title_font_size: number;
  title_color: string;
  recipient_font: string;
  recipient_font_style: string;
  recipient_font_size: number;
  recipient_color: string;
  body_font: string;
  body_font_style: string;
  body_font_size: number;
  body_color: string;
  body_line_spacing?: number; // Line spacing for body paragraphs
  
  // Signature fields
  signature_left_name: string;
  signature_left_title: string;
  signature_right_name: string;
  signature_right_title: string;
  signature_font: string;
  signature_font_style: string;
  signature_font_size: number;
  signature_color: string;
  
  is_default: boolean;
};

// Helper function to convert hex color to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Helper function to map font names to jsPDF supported fonts
function mapFontToSupported(fontName: string): string {
  // jsPDF only supports these standard fonts natively
  const supportedFonts = ['courier', 'helvetica', 'times'];
  
  // Map common fonts to the closest jsPDF supported font
  const fontMap: Record<string, string> = {
    // Serif fonts map to times
    'georgia': 'times',
    'palatino': 'times',
    'garamond': 'times',
    'cambria': 'times',
    'book antiqua': 'times',
    'bookman old style': 'times',
    
    // Sans-serif fonts map to helvetica
    'arial': 'helvetica',
    'verdana': 'helvetica',
    'tahoma': 'helvetica',
    'trebuchet ms': 'helvetica',
    'calibri': 'helvetica',
    'century gothic': 'helvetica',
    'segoe ui': 'helvetica'
  };
  
  // Convert to lowercase for case-insensitive matching
  const normalizedFont = fontName.toLowerCase();
  
  // Return the mapped font if it exists, otherwise return the original if it's supported,
  // or default to helvetica
  if (fontMap[normalizedFont]) {
    return fontMap[normalizedFont];
  } else if (supportedFonts.includes(normalizedFont)) {
    return normalizedFont;
  }
  
  return 'helvetica'; // Default fallback
}

// Helper function to map font styles to jsPDF supported styles
function mapFontStyleToSupported(fontStyle: string): string {
  // jsPDF only supports these font styles
  const supportedStyles = ['normal', 'italic', 'bold', 'bolditalic'];
  
  // Map additional styles to supported ones
  const styleMap: Record<string, string> = {
    'light': 'normal',
    'medium': 'normal',
    'semibold': 'bold'
  };
  
  // Convert to lowercase for case-insensitive matching
  const normalizedStyle = fontStyle.toLowerCase();
  
  // Return the mapped style if it exists, otherwise return the original if it's supported,
  // or default to normal
  if (styleMap[normalizedStyle]) {
    return styleMap[normalizedStyle];
  } else if (supportedStyles.includes(normalizedStyle)) {
    return normalizedStyle;
  }
  
  return 'normal'; // Default fallback
}

export async function generateCertificatePdf(
  data: CertificateData
): Promise<Uint8Array> {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Initialize Supabase client
  const supabase = createClient();
  
  // Fetch certificate template (either specified or default)
  let template: CertificateTemplate | null = null;
  
  if (data.templateId) {
    // Fetch specific template if ID is provided
    console.log('Fetching template with ID:', data.templateId);
    const { data: templateData, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('id', data.templateId)
      .single();
      
    if (error) {
      console.error('Error fetching template:', error);
    } else {
      template = templateData as CertificateTemplate;
      console.log('Template fetched successfully:', template);
      console.log('Signature fields in template:', {
        left_name: template.signature_left_name,
        left_title: template.signature_left_title,
        right_name: template.signature_right_name,
        right_title: template.signature_right_title
      });
    }
  }
  
  // If no template found or specified, use the default
  if (!template) {
    console.log('Fetching default template');
    const { data: defaultTemplate, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('is_default', true)
      .single();
      
    if (error) {
      console.error('Error fetching default template:', error);
      // Fallback to hardcoded values if no template found
    } else {
      template = defaultTemplate as CertificateTemplate;
      console.log('Default template fetched successfully:', template);
      console.log('Signature fields in default template:', {
        left_name: template.signature_left_name,
        left_title: template.signature_left_title,
        right_name: template.signature_right_name,
        right_title: template.signature_right_title
      });
    }
  }

  // Set document properties
  doc.setProperties({
    title: `Certificate of Training - ${data.sessionTitle}`,
    subject: 'Certificate of Training',
    author: 'CME Platform',
    keywords: 'certificate, training, completion',
    creator: 'CME Platform'
  });

  // Try to add background image
  try {
    // Get the public URL of the background image
    const { data: { publicUrl } } = supabase
      .storage
      .from('content')
      .getPublicUrl('certificates/background-image/certificate-background.png');

    // Fetch the image
    const imageResponse = await fetch(publicUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    
    // Get the array buffer directly (works in both browser and Node.js)
    const arrayBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Add the background image to the PDF using the array buffer
    doc.addImage(uint8Array, 'PNG', 0, 0, 297, 210);
  } catch (error) {
    console.error('Error adding background image:', error);
    // Fallback to a plain background if image fails to load
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 297, 210, 'F');
  }

  // Use template values if available, otherwise use defaults
  const titleText = template?.title || 'Certificate of Training';
  const subtitleText = template?.subtitle || 'is hereby presented to';
  const completionText = template?.completion_text || 'For having completed and achieved the required level of competence in';
  const qualityText = template?.quality_text || 'for establishment and sustenance of Medical Laboratories Quality';
  
  // Parse colors from template or use defaults
  const titleColor = template?.title_color ? hexToRgb(template.title_color) : { r: 0, g: 0, b: 0 };
  const recipientColor = template?.recipient_color ? hexToRgb(template.recipient_color) : { r: 0, g: 150, b: 76 };
  const bodyColor = template?.body_color ? hexToRgb(template.body_color) : { r: 0, g: 0, b: 0 };

  // Add title - map fonts to supported jsPDF fonts
  const titleFont = mapFontToSupported(template?.title_font || 'times');
  const titleFontStyle = mapFontStyleToSupported(template?.title_font_style || 'italic');
  doc.setFont(titleFont, titleFontStyle);
  doc.setFontSize(template?.title_font_size || 36);
  doc.setTextColor(titleColor.r, titleColor.g, titleColor.b);
  doc.text(titleText, 148.5, 40, { align: 'center' });

  // Add subtitle
  const bodyFont = mapFontToSupported(template?.body_font || 'times');
  const bodyFontStyle = mapFontStyleToSupported(template?.body_font_style || 'italic');
  doc.setFont(bodyFont, bodyFontStyle);
  doc.setFontSize(template?.body_font_size || 16);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  doc.text(subtitleText, 148.5, 65, { align: 'center' });

  // Add recipient name
  const recipientFont = mapFontToSupported(template?.recipient_font || 'helvetica');
  const recipientFontStyle = mapFontStyleToSupported(template?.recipient_font_style || 'bold');
  doc.setFont(recipientFont, recipientFontStyle);
  doc.setFontSize(template?.recipient_font_size || 28);
  doc.setTextColor(recipientColor.r, recipientColor.g, recipientColor.b);
  doc.text(data.userName.toUpperCase(), 148.5, 85, { align: 'center' });

  // Format date with ordinal suffix (e.g., "7th March 2025")
  const formattedDate = formatDateWithOrdinal(data.sessionDate);
  
  // Add date - reuse bodyFont from earlier but update style
  doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
  doc.setFontSize(template?.body_font_size || 16);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  doc.text(`On ${formattedDate}`, 148.5, 105, { align: 'center' });

  // Define the body paragraph section with consistent spacing
  const bodyStartY = 120;
  const lineSpacing = template?.body_line_spacing || 8; // Default line spacing if not specified
  let currentY = bodyStartY;
  
  // Set consistent font size for body text
  const bodyFontSize = template?.body_font_size || 12;
  doc.setFontSize(bodyFontSize);
  
  // Add training details - first line of body paragraph
  doc.text(completionText, 148.5, currentY, { align: 'center' });
  currentY += lineSpacing;
  
  // Just use the session title without standard reference
  const trainingTitle = data.sessionTitle.toUpperCase();
  
  // Use bold style for training title but keep the same font
  doc.setFont(bodyFont, mapFontStyleToSupported('bold'));
  
  // Handle multi-line training title with proper spacing
  const splitTrainingTitle = doc.splitTextToSize(trainingTitle, 200); // Wrap at 200mm width
  doc.text(splitTrainingTitle, 148.5, currentY, { align: 'center' });
  currentY += (splitTrainingTitle.length * lineSpacing);
  
  // Return to normal style for quality text
  doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
  
  // Add quality text with proper wrapping
  const splitQualityText = doc.splitTextToSize(qualityText, 200);
  doc.text(splitQualityText, 148.5, currentY, { align: 'center' });
  currentY += (splitQualityText.length * lineSpacing);
  
  // Add session date information
  const sessionMonth = data.sessionDate.split(' ')[0]; // Extract month
  const sessionYear = new Date(data.sessionDate).getFullYear();
  
  // Format the date text - with or without location
  let dateText;
  if (data.location) {
    dateText = `held at ${data.location} in ${sessionMonth} ${sessionYear}.`;
  } else {
    dateText = `held in ${sessionMonth} ${sessionYear}.`;
  }
  
  const splitDateText = doc.splitTextToSize(dateText, 200);
  doc.text(splitDateText, 148.5, currentY, { align: 'center' });
  currentY += (splitDateText.length * lineSpacing);

  // Generate QR code for verification - moved to top-left corner to avoid badge
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      margin: 1,
      width: 80
    });
    doc.addImage(qrCodeDataUrl, 'PNG', 20, 165, 20, 20);
    doc.setFontSize(8);
    doc.text('Scan to verify', 30, 190, { align: 'center' });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  // Add certificate number in a subtle way - kept at bottom right
  doc.setFontSize(8);
  doc.text(`Certificate Number: ${data.certificateNumber}`, 270, 205, { align: 'right' });

  // Debug template data
  console.log('Template data:', template);
  
  // Always use the template signature settings if available
  const signatureFont = mapFontToSupported(template?.signature_font || 'times');
  const signatureFontStyle = mapFontStyleToSupported(template?.signature_font_style || 'normal');
  const signatureFontSize = template?.signature_font_size || 10;
  const signatureColor = parseColor(template?.signature_color || '#000000');
  
  // Set signature font and color
  doc.setFont(signatureFont, signatureFontStyle);
  doc.setFontSize(signatureFontSize);
  doc.setTextColor(signatureColor.r, signatureColor.g, signatureColor.b);
  
  // Get signature names and titles from template or data
  // Priority: 1. Template signature fields if they exist, 2. Data signatories if provided, 3. Default values
  const useTemplateSignatures = template && 'signature_left_name' in template;
  
  // Left signature
  const leftName = useTemplateSignatures && template ? template.signature_left_name : 
                  (data.signatories && data.signatories[0]?.name) || 'Richard Barasa';
  
  const leftTitle = useTemplateSignatures && template ? template.signature_left_title : 
                   (data.signatories && data.signatories[0]?.title) || 'QA Manager Int\'l Bv & Lead Trainer';
  
  // Right signature
  const rightName = useTemplateSignatures && template ? template.signature_right_name : 
                   (data.signatories && data.signatories[1]?.name) || 'Daniel Obara';
  
  const rightTitle = useTemplateSignatures && template ? template.signature_right_title : 
                    (data.signatories && data.signatories[1]?.title) || 'SBU HR - International Business';
  
  console.log('Using signature names:', { leftName, leftTitle, rightName, rightTitle });
  
  // Left signature - moved slightly right (from 75 to 95)
  doc.text(leftName, 95, 185, { align: 'center' });
  doc.text(leftTitle, 95, 191, { align: 'center' });
  
  // Right signature - moved slightly left (from 222 to 202)
  doc.text(rightName, 202, 185, { align: 'center' });
  doc.text(rightTitle, 202, 191, { align: 'center' });

  // Convert the PDF to an array buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(pdfArrayBuffer);
}

// Helper function to format date with ordinal suffix (1st, 2nd, 3rd, etc.)
function formatDateWithOrdinal(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = format(date, 'MMMM');
  const year = date.getFullYear();
  
  const ordinalSuffix = getOrdinalSuffix(day);
  return `${day}${ordinalSuffix} ${month} ${year}`;
}

// Helper function to parse hex color to RGB components
function parseColor(hexColor: string) {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  return { r, g, b };
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatCertificateData({
  certificate,
  user,
  session,
  baseUrl,
  location,
  signatories
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
  location?: string;
  signatories?: {
    name: string;
    title: string;
  }[];
}): CertificateData {
  const userName = user.full_name;
  const sessionDate = format(new Date(session.start_time), 'MMMM dd, yyyy');
  const issuedDate = format(new Date(certificate.issued_at), 'MMMM dd, yyyy');
  const verificationUrl = `${baseUrl}/verify/${certificate.certificate_number}`;  // Using certificate_number as the id parameter

  return {
    certificateNumber: certificate.certificate_number,
    userName,
    sessionTitle: session.title,
    sessionDate,
    issuedDate,
    verificationUrl,
    location,
    signatories
  };
}
