-- Fix ambiguous column reference in topup_user_units function
CREATE OR REPLACE FUNCTION topup_user_units(
  p_user_id UUID,
  p_amount INTEGER,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  units INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user exists in user_units
  INSERT INTO user_units (user_id, units)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update user units
  UPDATE user_units
  SET units = units + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
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
  );
  
  -- Return updated units with qualified column names to avoid ambiguity
  RETURN QUERY
  SELECT u.user_id, u.units
  FROM user_units u
  WHERE u.user_id = p_user_id;
END;
$$;
