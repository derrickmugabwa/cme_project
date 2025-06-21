import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';
import { createPesaPalClient } from '@/lib/payment-providers/pesapal';

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
    
    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Get user profile for name information (optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', user.id)
      .single();
    
    // Submit order to PesaPal
    const orderResponse = await pesapalClient.submitOrder({
      amount: transaction.amount,
      currency: 'KES', // Assuming KES as default currency
      description: `Purchase of ${transaction.units_purchased} units`,
      email: email,
      phoneNumber: profile?.phone,
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      reference: transaction.id
    });
    
    // Update transaction with PesaPal order tracking ID
    // Ensure the metadata is properly stored as a JSONB object
    const updatedMetadata = {
      ...(transaction.metadata || {}),
      order_tracking_id: orderResponse.order_tracking_id,
      redirect_url: orderResponse.redirect_url,
      initiated_at: new Date().toISOString()
    };
    
    console.log('Updating transaction with metadata:', {
      transaction_id,
      order_tracking_id: orderResponse.order_tracking_id,
      metadata: updatedMetadata
    });
    
    await supabase
      .from('payment_transactions')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', transaction_id);
    
    return NextResponse.json({
      success: true,
      message: 'PesaPal payment initiated',
      authorization_url: orderResponse.redirect_url,
      order_tracking_id: orderResponse.order_tracking_id
    });
  } catch (error) {
    console.error('Error initiating PesaPal payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
