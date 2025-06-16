import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-client';

// M-Pesa callback handler
export async function POST(request: NextRequest) {
  console.log('M-Pesa callback received at:', new Date().toISOString());
  
  // Always return a 200 response to M-Pesa to avoid retries
  // We'll handle the processing internally
  const sendSuccessResponse = () => {
    return NextResponse.json(
      { ResultCode: 0, ResultDesc: 'Accepted' },
      { status: 200 }
    );
  };
  
  try {
    const supabase = createServerSupabaseClient();
    
    // Get transaction ID from query params
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transaction_id');
    
    if (!transactionId) {
      console.error('Missing transaction ID in callback');
      return sendSuccessResponse();
    }
    
    // Parse callback data
    const callbackData = await request.json();
    console.log('M-Pesa callback data:', JSON.stringify(callbackData));
    
    // Extract the callback body
    const stkCallback = callbackData.Body?.stkCallback;
    
    if (!stkCallback) {
      console.error('Invalid callback format');
      return sendSuccessResponse();
    }
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('status', 'pending')
      .single();
    
    if (transactionError || !transaction) {
      console.error('Transaction not found or already processed:', transactionError);
      return sendSuccessResponse();
    }
    
    // Log transaction details for debugging
    console.log(`Processing callback for transaction: ${transactionId}, current status: ${transaction.status}`);
    
    // Check if the transaction was successful
    const resultCode = stkCallback.ResultCode;
    
    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      
      // Extract payment details
      let mpesaReceiptNumber = '';
      let transactionDate = '';
      let phoneNumber = '';
      
      callbackMetadata.forEach((item: any) => {
        if (item.Name === 'MpesaReceiptNumber') {
          mpesaReceiptNumber = item.Value;
        } else if (item.Name === 'TransactionDate') {
          transactionDate = item.Value;
        } else if (item.Name === 'PhoneNumber') {
          phoneNumber = item.Value;
        }
      });
      
      // Process the successful payment
      console.log(`Processing M-Pesa payment for transaction ${transactionId} with receipt ${mpesaReceiptNumber}`);
      
      const { data: result, error: processError } = await supabase
        .rpc('process_successful_payment', {
          p_transaction_id: transactionId,
          p_provider_reference: mpesaReceiptNumber,
          p_provider_response: callbackData
        });
      
      if (processError) {
        console.error('Error processing successful payment:', processError);
      } else {
        console.log(`Payment processed successfully. Result: ${JSON.stringify(result)}`);
        
        // Double-check that units were added by fetching the transaction
        const { data: updatedTransaction } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();
          
        console.log(`Updated transaction status: ${updatedTransaction?.status}`);
        
        // Verify units were added
        const { data: userUnits } = await supabase
          .from('user_units')
          .select('units_balance')
          .eq('user_id', transaction.user_id)
          .single();
          
        console.log(`User units balance after payment: ${userUnits?.units_balance}`);
      }
    } else {
      // Payment failed
      const resultDesc = stkCallback.ResultDesc || 'Payment failed';
      
      // Mark payment as failed
      const { error: markError } = await supabase
        .rpc('mark_payment_failed', {
          p_transaction_id: transactionId,
          p_error_message: resultDesc,
          p_provider_response: callbackData
        });
      
      if (markError) {
        console.error('Error marking payment as failed:', markError);
      } else {
        console.log(`Payment marked as failed: ${resultDesc}`);
      }
    }
    
    // Always respond with success to M-Pesa
    return sendSuccessResponse();
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    // Safely log error details if available
    if (error instanceof Error) {
      console.log(`Error details: ${error.message}, ${error.stack}`);
    }
    return sendSuccessResponse();
  }
  
  // Final response
  return sendSuccessResponse();
}
