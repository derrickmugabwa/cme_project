-- Migration for Certificate System

-- 1. Create Certificates Table
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  attendance_id UUID NOT NULL REFERENCES session_attendance(id),
  certificate_number TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  downloaded_at TIMESTAMPTZ,
  UNIQUE(user_id, session_id)
);

-- Add RLS policies
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own certificates
CREATE POLICY "Users can view their own certificates"
  ON certificates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for admins and faculty to view all certificates
CREATE POLICY "Admins and faculty can view all certificates"
  ON certificates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'faculty')
  ));

-- 2. Create Certificate Generation Function
CREATE OR REPLACE FUNCTION generate_certificate(
  p_attendance_id UUID
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_session_id UUID;
  v_attendance_status TEXT;
  v_certificate_id UUID;
  v_certificate_number TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Get attendance record details
  SELECT 
    user_id, 
    session_id,
    status
  INTO 
    v_user_id, 
    v_session_id,
    v_attendance_status
  FROM session_attendance
  WHERE id = p_attendance_id;
  
  -- Check if attendance is approved
  IF v_attendance_status != 'approved' THEN
    RAISE EXCEPTION 'Cannot generate certificate for non-approved attendance';
  END IF;
  
  -- Check if certificate already exists
  SELECT EXISTS (
    SELECT 1 FROM certificates 
    WHERE user_id = v_user_id AND session_id = v_session_id
  ) INTO v_exists;
  
  -- If certificate already exists, return existing ID
  IF v_exists THEN
    SELECT id INTO v_certificate_id
    FROM certificates
    WHERE user_id = v_user_id AND session_id = v_session_id;
    
    RETURN v_certificate_id;
  END IF;
  
  -- Generate unique certificate number
  -- Format: CERT-{SessionID first 8 chars}-{UserID first 8 chars}-{Timestamp}
  v_certificate_number := 'CERT-' || 
                         SUBSTRING(v_session_id::text, 1, 8) || '-' ||
                         SUBSTRING(v_user_id::text, 1, 8) || '-' ||
                         TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  
  -- Create certificate record
  INSERT INTO certificates (
    user_id,
    session_id,
    attendance_id,
    certificate_number,
    issued_at
  ) VALUES (
    v_user_id,
    v_session_id,
    p_attendance_id,
    v_certificate_number,
    NOW()
  ) RETURNING id INTO v_certificate_id;
  
  RETURN v_certificate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger to Auto-Generate Certificates on Attendance Approval
CREATE OR REPLACE FUNCTION auto_generate_certificate()
RETURNS TRIGGER AS $$
BEGIN
  -- If attendance status changed to approved, generate certificate
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM generate_certificate(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_certificate_on_approval
  AFTER UPDATE OF status ON session_attendance
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_certificate();

-- 4. Create Certificate Verification Function
CREATE OR REPLACE FUNCTION verify_certificate(
  p_certificate_number TEXT
) RETURNS TABLE (
  certificate_id UUID,
  user_id UUID,
  user_full_name TEXT,
  session_id UUID,
  session_title TEXT,
  issued_at TIMESTAMPTZ,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS certificate_id,
    c.user_id,
    p.full_name AS user_full_name,
    c.session_id,
    s.title AS session_title,
    c.issued_at,
    TRUE AS is_valid
  FROM certificates c
  JOIN profiles p ON c.user_id = p.id
  JOIN sessions s ON c.session_id = s.id
  WHERE c.certificate_number = p_certificate_number;
  
  -- If no rows returned, certificate is invalid
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID AS certificate_id,
      NULL::UUID AS user_id,
      NULL::TEXT AS user_full_name,
      NULL::UUID AS session_id,
      NULL::TEXT AS session_title,
      NULL::TIMESTAMPTZ AS issued_at,
      FALSE AS is_valid;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create Function to Track Certificate Downloads
CREATE OR REPLACE FUNCTION record_certificate_download(
  p_certificate_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE certificates
  SET downloaded_at = NOW()
  WHERE id = p_certificate_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
