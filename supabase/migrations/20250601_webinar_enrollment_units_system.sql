-- Migration for Webinar Enrollment Units System

-- 1. Create Units Wallet Table
CREATE TABLE user_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE user_units ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own units
CREATE POLICY "Users can view their own units"
  ON user_units
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins to view all units
CREATE POLICY "Admins can view all units"
  ON user_units
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Policy for admins to update units
CREATE POLICY "Admins can update units"
  ON user_units
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- 2. Create Session Enrollment Table
CREATE TABLE session_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL DEFAULT 'enrolled',
  units_spent INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, session_id)
);

-- Add RLS policies
ALTER TABLE session_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own enrollments
CREATE POLICY "Users can view their own enrollments"
  ON session_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own enrollments
CREATE POLICY "Users can insert their own enrollments"
  ON session_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all enrollments
CREATE POLICY "Admins can view all enrollments"
  ON session_enrollments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'faculty')
  ));

-- 3. Create Session Unit Requirements Table
CREATE TABLE session_unit_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) UNIQUE,
  units_required INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE session_unit_requirements ENABLE ROW LEVEL SECURITY;

-- Policy for everyone to view unit requirements
CREATE POLICY "Everyone can view unit requirements"
  ON session_unit_requirements
  FOR SELECT
  USING (true);

-- Policy for admins to manage unit requirements
CREATE POLICY "Admins can manage unit requirements"
  ON session_unit_requirements
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- 4. Create Unit Transactions Table
CREATE TABLE unit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'topup', 'enrollment', 'refund', etc.
  reference_id UUID, -- Optional reference to session_id or payment_id
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Add RLS policies
ALTER TABLE unit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON unit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins to view all transactions
CREATE POLICY "Admins can view all transactions"
  ON unit_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- Policy for admins to insert transactions
CREATE POLICY "Admins can insert transactions"
  ON unit_transactions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin')
  ));

-- 5. Create Database Functions

-- Top Up Units Function
CREATE OR REPLACE FUNCTION topup_user_units(
  p_user_id UUID,
  p_amount INTEGER,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Check if user exists in user_units
  INSERT INTO user_units (user_id, units)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update user's units
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
    auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enroll in Session Function
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
  
  -- Get user's current units
  SELECT units INTO v_user_units
  FROM user_units
  WHERE user_id = p_user_id;
  
  -- If user has no units record, create one with 0 units
  IF v_user_units IS NULL THEN
    INSERT INTO user_units (user_id, units)
    VALUES (p_user_id, 0)
    RETURNING units INTO v_user_units;
  END IF;
  
  -- Check if user has enough units
  IF v_user_units < v_units_required THEN
    RAISE EXCEPTION 'Insufficient units. Required: %, Available: %', v_units_required, v_user_units;
  END IF;
  
  -- Begin transaction
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
