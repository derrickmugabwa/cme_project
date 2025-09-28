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
  topic?: string; // Session topic/specialty
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
  const qualityText = template?.quality_text || '';
  
  // Parse colors from template or use defaults
  const titleColor = template?.title_color ? hexToRgb(template.title_color) : { r: 0, g: 0, b: 0 };
  const recipientColor = template?.recipient_color ? hexToRgb(template.recipient_color) : { r: 0, g: 150, b: 76 };
  const bodyColor = template?.body_color ? hexToRgb(template.body_color) : { r: 0, g: 0, b: 0 };

  // Define content area boundaries to fit within background image margins
  const contentMarginLeft = 25;   // Left margin to fit within background
  const contentMarginRight = 25;  // Right margin to fit within background  
  const contentMarginTop = 25;    // Top margin to fit within background
  const contentMarginBottom = 25; // Bottom margin to fit within background
  const contentWidth = 297 - contentMarginLeft - contentMarginRight; // Available width
  const centerX = 148.5; // Center of the page

  // Add title - positioned with significant space below the METROPOLIS logo
  const titleFont = mapFontToSupported(template?.title_font || 'times');
  const titleFontStyle = mapFontStyleToSupported(template?.title_font_style || 'italic');
  doc.setFont(titleFont, titleFontStyle);
  doc.setFontSize(template?.title_font_size || 32);
  doc.setTextColor(titleColor.r, titleColor.g, titleColor.b);
  doc.text(titleText, centerX, 72, { align: 'center' }); // Moved even further down for more clearance

  // Add subtitle
  const bodyFont = mapFontToSupported(template?.body_font || 'times');
  const bodyFontStyle = mapFontStyleToSupported(template?.body_font_style || 'italic');
  doc.setFont(bodyFont, bodyFontStyle);
  doc.setFontSize(template?.body_font_size || 14);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  doc.text(subtitleText, centerX, 88, { align: 'center' });

  // Add recipient name - positioned evenly between subtitle and date
  // Convert recipient name to title case (first letters uppercase, rest lowercase)
  const recipientName = data.userName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const recipientFont = mapFontToSupported(template?.recipient_font || 'helvetica');
  const recipientFontStyle = mapFontStyleToSupported(template?.recipient_font_style || 'bold');
  doc.setFont(recipientFont, recipientFontStyle);
  doc.setFontSize(template?.recipient_font_size || 24);
  doc.setTextColor(recipientColor.r, recipientColor.g, recipientColor.b);
  doc.text(recipientName, centerX, 105, { align: 'center' });
  
  // Add underline to recipient name with matching color
  const nameWidth = doc.getTextWidth(recipientName);
  const underlineStartX = centerX - (nameWidth / 2);
  const underlineEndX = centerX + (nameWidth / 2);
  const underlineY = 105 + 2; // 2mm below the text baseline
  
  // Set line color to match the recipient name color
  doc.setDrawColor(recipientColor.r, recipientColor.g, recipientColor.b);
  doc.setLineWidth(0.5); // Set line thickness
  doc.line(underlineStartX, underlineY, underlineEndX, underlineY);

  // Format date with ordinal suffix (e.g., "7th March 2025")
  const formattedDate = formatDateWithOrdinal(data.sessionDate);

  // Define the body paragraph section - moved up since date is now below
  const bodyStartY = 122;
  const lineSpacing = template?.body_line_spacing || 5;
  let currentY = bodyStartY;
  
  // Set consistent font size for body text - smaller
  const bodyFontSize = template?.body_font_size || 10;
  doc.setFontSize(bodyFontSize);
  
  // Create the full text but we'll render it in parts with different styles
  // Convert session title to title case (first letters uppercase, rest lowercase)
  const trainingTitle = data.sessionTitle
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Use a simpler approach - create the full text with explicit spacing
  let fullText = completionText + ' ';
  
  // Add session title (we'll handle bold formatting differently)
  fullText += trainingTitle;
  
  // Add quality text with explicit spacing
  if (qualityText) {
    fullText += '  ' + qualityText; // Use double space to ensure visibility
  }
  
  // Set normal font for the base text
  doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  
  // Calculate positions for mixed formatting
  const completionTextWidth = doc.getTextWidth(completionText + ' ');
  
  // Set bold font for title width calculation
  doc.setFont(bodyFont, mapFontStyleToSupported('bold'));
  doc.setFontSize(bodyFontSize);
  const trainingTitleWidth = doc.getTextWidth(trainingTitle);
  
  // Calculate total width for centering
  doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
  doc.setFontSize(bodyFontSize);
  const fullTextWidth = doc.getTextWidth(fullText);
  const startX = centerX - (fullTextWidth / 2);
  
  // Render completion text
  doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  doc.text(completionText + ' ', startX, currentY);
  
  // Render session title in bold
  doc.setFont(bodyFont, mapFontStyleToSupported('bold'));
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  doc.text(trainingTitle, startX + completionTextWidth, currentY);
  
  // Render quality text if it exists
  if (qualityText) {
    doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
    doc.text('  ' + qualityText, startX + completionTextWidth + trainingTitleWidth, currentY);
  }
  
  currentY += lineSpacing;
  
  // Add topic on the next line if available
  if (data.topic) {
    // Add some spacing before topic
    currentY += 2;
    
    // Set italic style for topic
    doc.setFont(bodyFont, mapFontStyleToSupported('italic'));
    const topicText = `Topic: ${data.topic}`;
    const splitTopicText = doc.splitTextToSize(topicText, contentWidth - 40);
    doc.text(splitTopicText, centerX, currentY, { align: 'center' });
    currentY += (splitTopicText.length * lineSpacing);
  }
  
  // Add date below the topic
  currentY += 2; // Add some spacing before date
  doc.setFont(bodyFont, mapFontStyleToSupported(template?.body_font_style || 'normal'));
  doc.setFontSize(template?.body_font_size || 10);
  doc.setTextColor(bodyColor.r, bodyColor.g, bodyColor.b);
  const dateText = `Date: ${formattedDate}`;
  doc.text(dateText, centerX, currentY, { align: 'center' });
  currentY += lineSpacing;
  


  // Generate QR code for verification - positioned within content area
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      margin: 1,
      width: 60
    });
    doc.addImage(qrCodeDataUrl, 'PNG', contentMarginLeft + 5, 155, 15, 15);
    doc.setFontSize(6);
    doc.text('Scan to verify', contentMarginLeft + 12.5, 175, { align: 'center' });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  // Add certificate number in a subtle way - positioned within content area
  doc.setFontSize(6);
  doc.text(`Certificate Number: ${data.certificateNumber}`, 297 - contentMarginRight - 5, 210 - contentMarginBottom, { align: 'right' });

  // Debug template data
  console.log('Template data:', template);
  
  // Always use the template signature settings if available
  const signatureFont = mapFontToSupported(template?.signature_font || 'times');
  const signatureFontStyle = mapFontStyleToSupported(template?.signature_font_style || 'normal');
  const signatureFontSize = template?.signature_font_size || 10;
  const signatureColor = parseColor(template?.signature_color || '#000000');
  
  // Set signature font and color - smaller for compact layout
  doc.setFont(signatureFont, signatureFontStyle);
  doc.setFontSize(template?.signature_font_size || 8); // Smaller signature font
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
  
  // Calculate signature positions within content area
  const signatureY = 210 - contentMarginBottom - 15; // Position signatures above bottom margin
  const leftSignatureX = contentMarginLeft + 60;     // Left signature position
  const rightSignatureX = 297 - contentMarginRight - 60; // Right signature position
  
  // Left signature - positioned within content area
  doc.text(leftName, leftSignatureX, signatureY, { align: 'center' });
  doc.text(leftTitle, leftSignatureX, signatureY + 5, { align: 'center' });
  
  // Right signature - positioned within content area
  doc.text(rightName, rightSignatureX, signatureY, { align: 'center' });
  doc.text(rightTitle, rightSignatureX, signatureY + 5, { align: 'center' });

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
    topic?: string;
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
    topic: session.topic,
    signatories
  };
}
