import { NextRequest, NextResponse } from 'next/server';
import { createPesaPalClient } from '@/lib/payment-providers/pesapal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipnUrl } = body;

    if (!ipnUrl) {
      return NextResponse.json({ error: 'Missing IPN URL' }, { status: 400 });
    }

    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Register the IPN URL
    const ipnId = await pesapalClient.registerIPN(ipnUrl);
    
    // Return the IPN ID
    return NextResponse.json({ 
      success: true, 
      ipnId,
      callbackUrl: ipnUrl.replace('/api/payments/pesapal/ipn', '/dashboard/units/payment-complete'),
      message: 'IPN URL registered successfully' 
    });
    
  } catch (error: any) {
    console.error('Error registering IPN URL:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to register IPN URL' 
    }, { status: 500 });
  }
}
