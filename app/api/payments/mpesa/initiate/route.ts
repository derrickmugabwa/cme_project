import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// M-Pesa API integration
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
    const { transaction_id, phone_number } = body;
    
    if (!transaction_id || !phone_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate phone number format (simple validation)
    const phoneRegex = /^(?:\+?254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
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
    
    // Format phone number for M-Pesa (ensure it starts with 254)
    let formattedPhone = phone_number;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    // Get M-Pesa credentials from environment variables
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const passkey = process.env.MPESA_PASSKEY;
    const shortcode = process.env.MPESA_SHORTCODE;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    
    if (!consumerKey || !consumerSecret || !passkey || !shortcode || !callbackUrl) {
      console.error('Missing M-Pesa configuration');
      
      // Update transaction status to failed
      await supabase
        .rpc('mark_payment_failed', {
          p_transaction_id: transaction_id,
          p_error_message: 'Missing M-Pesa configuration'
        });
      
      return NextResponse.json(
        { error: 'Payment provider configuration error' },
        { status: 500 }
      );
    }
    
    // Get OAuth token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Failed to get M-Pesa token:', tokenData);
      
      // Update transaction status to failed
      await supabase
        .rpc('mark_payment_failed', {
          p_transaction_id: transaction_id,
          p_error_message: 'Failed to authenticate with payment provider'
        });
      
      return NextResponse.json(
        { error: 'Payment provider authentication failed' },
        { status: 500 }
      );
    }
    
    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    
    // Generate password
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    
    // Prepare STK Push request
    const fullCallbackUrl = `${callbackUrl}?transaction_id=${transaction_id}`;
    
    // Log the callback URL for debugging
    console.log(`M-Pesa callback URL configured as: ${fullCallbackUrl}`);
    
    const stkPushRequest = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(transaction.amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: fullCallbackUrl,
      AccountReference: `Units-${transaction.id.slice(0, 8)}`,
      TransactionDesc: `Purchase of ${transaction.units_purchased} units`
    };
    
    // Send STK Push request
    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPushRequest)
      }
    );
    
    const stkData = await stkResponse.json();
    
    if (!stkResponse.ok || !stkData.CheckoutRequestID) {
      console.error('Failed to initiate M-Pesa payment:', stkData);
      
      // Update transaction status to failed
      await supabase
        .rpc('mark_payment_failed', {
          p_transaction_id: transaction_id,
          p_error_message: 'Failed to initiate payment',
          p_provider_response: stkData
        });
      
      return NextResponse.json(
        { error: 'Failed to initiate payment' },
        { status: 500 }
      );
    }
    
    // Update transaction with M-Pesa request details
    await supabase
      .from('payment_transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          phone_number: formattedPhone,
          checkout_request_id: stkData.CheckoutRequestID,
          merchant_request_id: stkData.MerchantRequestID
        }
      })
      .eq('id', transaction_id);
    
    return NextResponse.json({
      success: true,
      message: 'M-Pesa payment initiated',
      checkout_request_id: stkData.CheckoutRequestID
    });
  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
