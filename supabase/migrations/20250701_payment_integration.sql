-- Migration for Payment Integration (M-Pesa and Paystack)

-- 1. Create Payment Settings Table
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'mpesa' or 'paystack'
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage payment settings
CREATE POLICY "Admins can manage payment settings"
  ON payment_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Policy for everyone to view active payment settings
CREATE POLICY "Everyone can view active payment settings"
  ON payment_settings
  FOR SELECT
  USING (is_active = true);

-- 2. Create Payment Transactions Table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10, 2) NOT NULL,
  units_purchased INTEGER NOT NULL,
  payment_method TEXT NOT NULL, -- 'mpesa' or 'paystack'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  provider_reference TEXT, -- Reference ID from payment provider
  provider_response JSONB DEFAULT '{}'::jsonb, -- Response data from provider
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own transactions
CREATE POLICY "Users can view their own payment transactions"
  ON payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins to view all transactions
CREATE POLICY "Admins can view all payment transactions"
  ON payment_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Policy for users to insert their own transactions
CREATE POLICY "Users can insert their own payment transactions"
  ON payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for system to update transactions (via functions)
CREATE POLICY "System can update payment transactions"
  ON payment_transactions
  FOR UPDATE
  USING (true);

-- 3. Create Function to Process Successful Payment
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
  
  -- Add units to user's account
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

-- 4. Create Function to Mark Payment as Failed
CREATE OR REPLACE FUNCTION mark_payment_failed(
  p_transaction_id UUID,
  p_error_message TEXT DEFAULT NULL,
  p_provider_response JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE payment_transactions
  SET 
    status = 'failed',
    provider_response = p_provider_response,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb), 
      '{error}', 
      to_jsonb(COALESCE(p_error_message, 'Payment failed'))
    ),
    updated_at = now()
  WHERE id = p_transaction_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Function to Get Exchange Rate (Units to Currency)
-- This would typically be configured by an admin
CREATE OR REPLACE FUNCTION get_units_exchange_rate(
  p_payment_method TEXT DEFAULT NULL
) RETURNS DECIMAL AS $$
BEGIN
  -- Default exchange rate: 1 unit = 1.00 currency unit
  -- In a real implementation, this would be fetched from a configuration table
  RETURN 1.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insert Default Payment Settings
INSERT INTO payment_settings (provider, is_active, config)
VALUES 
  ('mpesa', true, '{"display_name": "M-Pesa", "description": "Pay with M-Pesa mobile money"}'::jsonb),
  ('paystack', true, '{"display_name": "Paystack", "description": "Pay with credit/debit card via Paystack"}'::jsonb);
