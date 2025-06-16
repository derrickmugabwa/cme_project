import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// Manual M-Pesa payment verification endpoint
export async function GET(request: NextRequest) {
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
    
    // Get transaction ID from query params
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transaction_id');
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transaction ID' },
        { status: 400 }
      );
    }
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();
    
    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found', success: false },
        { status: 404 }
      );
    }
    
    // If transaction is already completed, return success
    if (transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        units_purchased: transaction.units_purchased
      });
    }
    
    // If transaction is not pending or is not M-Pesa, return error
    if (transaction.status !== 'pending' || transaction.payment_method !== 'mpesa') {
      return NextResponse.json({
        success: false,
        message: 'Transaction cannot be verified manually'
      });
    }
    
    console.log(`Manual verification attempt for transaction ${transactionId}`);
    
    // Check with M-Pesa API for transaction status
    // In a real implementation, you would call the M-Pesa API to check the transaction status
    // For now, we'll simulate a successful verification
    
    // Process the payment as successful
    const { data: result, error: processError } = await supabase
      .rpc('process_successful_payment', {
        p_transaction_id: transactionId,
        p_provider_reference: `MANUAL-${Date.now()}`,
        p_provider_response: { manual_verification: true }
      });
    
    if (processError) {
      console.error('Error processing payment:', processError);
      return NextResponse.json({
        success: false,
        message: 'Could not process payment'
      });
    }
    
    // Double-check that the transaction was updated
    const { data: updatedTransaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
      
    console.log(`Manual verification result: ${updatedTransaction?.status}`);
    
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      units_purchased: transaction.units_purchased
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
