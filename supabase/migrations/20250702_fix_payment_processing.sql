-- Fix process_successful_payment function to correctly call topup_user_units

-- Drop and recreate the process_successful_payment function
DROP FUNCTION IF EXISTS process_successful_payment(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION process_successful_payment(
  p_transaction_id UUID,
  p_provider_reference TEXT,
  p_provider_response JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_units_purchased INTEGER;
  v_transaction_exists BOOLEAN;
BEGIN
  -- Check if transaction exists and is still pending
  SELECT 
    EXISTS(
      SELECT 1 FROM payment_transactions 
      WHERE id = p_transaction_id AND status = 'pending'
    )
  INTO v_transaction_exists;
  
  IF NOT v_transaction_exists THEN
    RETURN FALSE; -- Transaction doesn't exist or is already processed
  END IF;
  
  -- Get transaction details
  SELECT 
    user_id, 
    units_purchased
  INTO 
    v_user_id, 
    v_units_purchased
  FROM payment_transactions
  WHERE id = p_transaction_id;
  
  -- Update transaction status
  UPDATE payment_transactions
  SET 
    status = 'completed',
    provider_reference = p_provider_reference,
    provider_response = p_provider_response,
    updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Add units to user's account with all required parameters
  PERFORM topup_user_units(
    v_user_id,
    v_units_purchased,
    v_user_id, -- Using the user's own ID as the admin ID for payment-initiated top-ups
    'Payment via ' || (SELECT payment_method FROM payment_transactions WHERE id = p_transaction_id)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Update transaction to failed status on error
    UPDATE payment_transactions
    SET 
      status = 'failed',
      metadata = jsonb_set(metadata, '{error}', to_jsonb(SQLERRM)),
      updated_at = now()
    WHERE id = p_transaction_id;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
