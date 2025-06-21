import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';
import { createPesaPalClient } from '@/lib/payment-providers/pesapal';

// Use a different approach to avoid the Next.js dynamic route parameter error
export async function GET(request: NextRequest, { params }: any) {
  try {
    // Get the order tracking ID from the URL directly
    const url = request.url;
    const orderTrackingId = url.split('/').pop();
    
    if (!orderTrackingId) {
      return NextResponse.json(
        { error: 'Missing order tracking ID' },
        { status: 400 }
      );
    }
    
    // Create Supabase client with service role
    const supabase = createServerSupabaseClient();
    
    // Skip the problematic JSONB path query and directly get all pending PesaPal transactions
    const { data: allTransactions, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_method', 'pesapal')
      .eq('status', 'pending');
    
    // Manually filter transactions where metadata.order_tracking_id matches
    let transactions = [];
    if (allTransactions) {
      console.log('Found pending PesaPal transactions:', allTransactions.length);
      
      transactions = allTransactions.filter(t => {
        // Log each transaction's metadata for debugging
        console.log('Transaction metadata:', t.id, t.metadata);
        
        return t.metadata && 
               typeof t.metadata === 'object' && 
               t.metadata.order_tracking_id === orderTrackingId;
      });
      
      console.log('Filtered transactions:', transactions.length);
    }
    
    if (transactionError || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    const transaction = transactions[0];
    
    // If transaction is already completed or failed, return its status
    if (transaction.status !== 'pending') {
      return NextResponse.json({
        success: transaction.status === 'completed',
        status: transaction.status,
        units: transaction.units_purchased,
        message: transaction.status === 'completed' 
          ? 'Payment was successful' 
          : 'Payment failed'
      });
    }
    
    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Get transaction status from PesaPal
    const statusResponse = await pesapalClient.getTransactionStatus(orderTrackingId);
    
    // Log the status response for debugging
    console.log('PesaPal status response:', statusResponse);
    console.log('PesaPal status response type:', typeof statusResponse);
    console.log('PesaPal status response JSON:', JSON.stringify(statusResponse, null, 2));
    
    // Process based on status
    // PesaPal returns status in various formats:
    // - 'COMPLETED' or 'COMPLETE' in some responses
    // - status: '200' and payment_status_description: 'Completed' in others
    // Use type assertion to handle the extended PesaPal response format
    const pesapalResponse = statusResponse as any;
    
    // Normalize status to uppercase for comparison
    const normalizedStatus = (statusResponse.status || '').toUpperCase();
    const isCompleted = 
        normalizedStatus === 'COMPLETED' || 
        normalizedStatus === 'COMPLETE' || 
        (pesapalResponse.status === '200' && 
         (pesapalResponse.payment_status_description === 'Completed' || 
          pesapalResponse.payment_status_description === 'COMPLETED'));
    
    console.log('Payment verification - Normalized status:', normalizedStatus);
    console.log('Payment verification - Is completed:', isCompleted);
    
    if (isCompleted) {
      // Process successful payment
      await supabase.rpc('process_successful_payment', {
        p_transaction_id: transaction.id,
        p_provider_reference: orderTrackingId,
        p_provider_response: statusResponse
      });
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        units: transaction.units_purchased,
        message: 'Payment was successful'
      });
    } else if (statusResponse.status === 'FAILED') {
      // Mark payment as failed
      await supabase.rpc('mark_payment_failed', {
        p_transaction_id: transaction.id,
        p_error_message: 'Payment failed',
        p_provider_response: statusResponse
      });
      
      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Payment failed'
      });
    } else {
      // Payment is still pending or in another state
      // Return success: true for pending payments to avoid showing error on the payment-complete page
      return NextResponse.json({
        success: true,
        status: 'pending',
        units: transaction.units_purchased,
        message: 'Your payment is being processed. This may take a few moments.'
      });
    }
  } catch (error) {
    console.error('Error verifying PesaPal payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
