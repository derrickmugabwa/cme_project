-- Migration to add PesaPal as a payment method in the payment_settings table
-- NOTE: This migration will only be run with explicit user approval

-- Insert PesaPal into payment_settings table
INSERT INTO payment_settings (name, display_name, is_active, config, created_at, updated_at)
VALUES (
  'pesapal',
  'PesaPal',
  TRUE,
  jsonb_build_object(
    'consumer_key', '',
    'consumer_secret', '',
    'environment', 'production',
    'ipn_id', '',
    'callback_url', ''
  ),
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Add comment to explain this payment method
COMMENT ON ROW payment_settings WHERE name = 'pesapal' IS 'PesaPal payment gateway for East Africa';
