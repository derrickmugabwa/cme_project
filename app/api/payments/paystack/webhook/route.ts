import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';
import crypto from 'crypto';

// Paystack webhook handler
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get Paystack secret key for signature verification
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecretKey) {
      console.error('Missing Paystack configuration');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }
    
    // Get the signature from the request header
    const signature = request.headers.get('x-paystack-signature');
    
    if (!signature) {
      console.error('Missing Paystack signature');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    
    // Get the raw request body for signature verification
    const rawBody = await request.text();
    
    // Verify the signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(rawBody)
      .digest('hex');
    
    if (hash !== signature) {
      console.error('Invalid Paystack signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
    
    // Parse the request body
    const event = JSON.parse(rawBody);
    
    // Only process charge.success events
    if (event.event !== 'charge.success') {
      return NextResponse.json({ status: 'Ignored non-payment event' });
    }
    
    const data = event.data;
    const reference = data.reference;
    
    // Extract transaction ID from reference (format: units-{transaction_id})
    const transactionId = reference.startsWith('units-') 
      ? reference.substring(6) 
      : null;
    
    if (!transactionId) {
      console.error('Invalid transaction reference format');
      return NextResponse.json({ status: 'Invalid reference format' });
    }
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('status', 'pending')
      .single();
    
    if (transactionError || !transaction) {
      console.error('Transaction not found or already processed');
      return NextResponse.json({ status: 'Transaction not found or already processed' });
    }
    
    // Process the successful payment
    const { data: result, error: processError } = await supabase
      .rpc('process_successful_payment', {
        p_transaction_id: transactionId,
        p_provider_reference: data.reference,
        p_provider_response: event
      });
    
    if (processError) {
      console.error('Error processing successful payment:', processError);
      return NextResponse.json(
        { status: 'Error processing payment' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ status: 'Payment processed successfully' });
  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
