-- Drop and recreate the topup_user_units function to fix ambiguous column reference
DROP FUNCTION IF EXISTS topup_user_units(UUID, INTEGER, UUID, TEXT);

CREATE OR REPLACE FUNCTION topup_user_units(
  p_user_id UUID,
  p_amount INTEGER,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_updated_units INTEGER;
BEGIN
  -- Check if user exists in user_units
  INSERT INTO user_units (user_id, units)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update user units
  UPDATE user_units
  SET units = units + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING units INTO v_updated_units;
  
  -- Record transaction
  INSERT INTO unit_transactions (
    user_id,
    amount,
    transaction_type,
    notes,
    created_by
  ) VALUES (
    p_user_id,
    p_amount,
    'topup',
    p_notes,
    p_admin_id
  )
  RETURNING id INTO v_transaction_id;
  
  -- Return result as JSONB to avoid column name conflicts
  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'units', v_updated_units
  );
END;
$$;
