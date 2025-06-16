import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// Paystack payment initiation
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Create Supabase client with service role to bypass RLS
    const supabase = createServerSupabaseClient();
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { transaction_id, email } = body;
    
    if (!transaction_id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();
    
    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Invalid transaction' },
        { status: 400 }
      );
    }
    
    // Get Paystack credentials from environment variables
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || 
      `${request.nextUrl.origin}/dashboard/units/payment-complete`;
    
    if (!paystackSecretKey) {
      console.error('Missing Paystack configuration');
      
      // Update transaction status to failed
      await supabase
        .rpc('mark_payment_failed', {
          p_transaction_id: transaction_id,
          p_error_message: 'Missing Paystack configuration'
        });
      
      return NextResponse.json(
        { error: 'Payment provider configuration error' },
        { status: 500 }
      );
    }
    
    // Prepare Paystack request
    const paystackRequest = {
      email: email,
      amount: Math.ceil(transaction.amount * 100), // Paystack amount is in kobo (smallest currency unit)
      callback_url: `${callbackUrl}?transaction_id=${transaction_id}`,
      reference: `units-${transaction_id}`,
      metadata: {
        transaction_id: transaction_id,
        units_purchased: transaction.units_purchased,
        custom_fields: [
          {
            display_name: "Units Purchased",
            variable_name: "units_purchased",
            value: transaction.units_purchased
          },
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: user.id
          }
        ]
      }
    };
    
    // Initialize Paystack transaction
    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paystackRequest)
      }
    );
    
    const paystackData = await paystackResponse.json();
    
    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Failed to initiate Paystack payment:', paystackData);
      
      // Update transaction status to failed
      await supabase
        .rpc('mark_payment_failed', {
          p_transaction_id: transaction_id,
          p_error_message: 'Failed to initiate payment',
          p_provider_response: paystackData
        });
      
      return NextResponse.json(
        { error: 'Failed to initiate payment' },
        { status: 500 }
      );
    }
    
    // Update transaction with Paystack details
    await supabase
      .from('payment_transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          email: email,
          paystack_reference: paystackData.data.reference,
          access_code: paystackData.data.access_code
        }
      })
      .eq('id', transaction_id);
    
    return NextResponse.json({
      success: true,
      message: 'Paystack payment initiated',
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    });
  } catch (error) {
    console.error('Error initiating Paystack payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
