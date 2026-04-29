-- Fix enrollment function to properly handle zero-cost webinars
-- This allows users to enroll in free webinars without needing any units

CREATE OR REPLACE FUNCTION enroll_in_session(
  p_session_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
  v_units_required INTEGER;
  v_user_units INTEGER;
BEGIN
  -- Get units required for this session
  SELECT units_required INTO v_units_required
  FROM session_unit_requirements
  WHERE session_id = p_session_id;
  
  -- If no requirement found, default to 1 unit
  IF v_units_required IS NULL THEN
    v_units_required := 1;
  END IF;
  
  -- If the session is free (0 units required), skip unit checks
  IF v_units_required = 0 THEN
    -- Create enrollment record directly for free sessions
    INSERT INTO session_enrollments (
      user_id,
      session_id,
      units_spent
    ) VALUES (
      p_user_id,
      p_session_id,
      0
    );
    
    -- Record transaction for audit purposes
    INSERT INTO unit_transactions (
      user_id,
      amount,
      transaction_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      p_user_id,
      0,
      'enrollment',
      p_session_id,
      'Free enrollment in session',
      p_user_id
    );
    
    RETURN TRUE;
  END IF;
  
  -- For paid sessions, check user's units
  SELECT units INTO v_user_units
  FROM user_units
  WHERE user_id = p_user_id;
  
  -- If user has no units record, create one with 0 units
  IF v_user_units IS NULL THEN
    INSERT INTO user_units (user_id, units)
    VALUES (p_user_id, 0)
    RETURNING units INTO v_user_units;
  END IF;
  
  -- Check if user has enough units for paid sessions
  IF v_user_units < v_units_required THEN
    RAISE EXCEPTION 'Insufficient units. Required: %, Available: %', v_units_required, v_user_units;
  END IF;
  
  -- Begin transaction for paid enrollment
  BEGIN
    -- Deduct units from user's wallet
    UPDATE user_units
    SET units = units - v_units_required,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Create enrollment record
    INSERT INTO session_enrollments (
      user_id,
      session_id,
      units_spent
    ) VALUES (
      p_user_id,
      p_session_id,
      v_units_required
    );
    
    -- Record transaction
    INSERT INTO unit_transactions (
      user_id,
      amount,
      transaction_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      p_user_id,
      -v_units_required,
      'enrollment',
      p_session_id,
      'Enrollment in session',
      p_user_id
    );
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
