import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// Units top-up endpoint
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
    const { unitsAmount, paymentMethod } = body;
    
    // Validate input
    if (!unitsAmount || unitsAmount < 1) {
      return NextResponse.json(
        { error: 'Invalid units amount' },
        { status: 400 }
      );
    }
    
    if (!paymentMethod || !['mpesa', 'paystack', 'pesapal'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }
    
    // Get exchange rate (units to currency)
    const { data: exchangeRateData, error: exchangeRateError } = await supabase
      .rpc('get_units_exchange_rate', {
        p_payment_method: paymentMethod
      });
    
    if (exchangeRateError) {
      console.error('Error getting exchange rate:', exchangeRateError);
      return NextResponse.json(
        { error: 'Error calculating payment amount' },
        { status: 500 }
      );
    }
    
    const exchangeRate = exchangeRateData || 1.0; // Default to 1:1 if not configured
    
    // Calculate payment amount
    const amount = unitsAmount * exchangeRate;
    
    // Create payment transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        units_purchased: unitsAmount,
        payment_method: paymentMethod,
        status: 'pending',
        metadata: {
          initiated_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (transactionError) {
      console.error('Error creating payment transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create payment transaction' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      amount: transaction.amount,
      units: transaction.units_purchased,
      payment_method: transaction.payment_method
    });
  } catch (error) {
    console.error('Error initiating units top-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
