-- Create certificate_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  title TEXT NOT NULL DEFAULT 'Certificate of Training',
  subtitle TEXT NOT NULL DEFAULT 'is hereby presented to',
  completion_text TEXT NOT NULL DEFAULT 'For having completed and achieved the required level of competence in',
  quality_text TEXT NOT NULL DEFAULT 'for establishment and sustenance of Medical Laboratories Quality',
  title_font VARCHAR NOT NULL DEFAULT 'times',
  title_font_style VARCHAR NOT NULL DEFAULT 'italic',
  title_font_size INTEGER NOT NULL DEFAULT 36,
  title_color VARCHAR NOT NULL DEFAULT '#000000',
  recipient_font VARCHAR NOT NULL DEFAULT 'helvetica',
  recipient_font_style VARCHAR NOT NULL DEFAULT 'bold',
  recipient_font_size INTEGER NOT NULL DEFAULT 28,
  recipient_color VARCHAR NOT NULL DEFAULT '#00964C',
  body_font VARCHAR NOT NULL DEFAULT 'times',
  body_font_style VARCHAR NOT NULL DEFAULT 'normal',
  body_font_size INTEGER NOT NULL DEFAULT 12,
  body_color VARCHAR NOT NULL DEFAULT '#000000',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to the table
COMMENT ON TABLE certificate_templates IS 'Configurable templates for certificate generation';

-- Create a function to ensure only one default template
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE certificate_templates SET is_default = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to enforce single default template
DROP TRIGGER IF EXISTS ensure_single_default_template_trigger ON certificate_templates;
CREATE TRIGGER ensure_single_default_template_trigger
BEFORE INSERT OR UPDATE ON certificate_templates
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_template();

-- Insert a default template if none exists
INSERT INTO certificate_templates (
  name, 
  title, 
  subtitle, 
  completion_text, 
  quality_text, 
  is_default
)
SELECT 
  'Default Template', 
  'Certificate of Training', 
  'is hereby presented to', 
  'For having completed and achieved the required level of competence in', 
  'for establishment and sustenance of Medical Laboratories Quality',
  true
WHERE NOT EXISTS (SELECT 1 FROM certificate_templates);

-- Add RLS policies
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read certificate templates
CREATE POLICY certificate_templates_select_policy
  ON certificate_templates
  FOR SELECT
  USING (true);

-- Only allow admins to insert/update/delete certificate templates
CREATE POLICY certificate_templates_insert_policy
  ON certificate_templates
  FOR INSERT
  WITH CHECK (check_is_admin());

CREATE POLICY certificate_templates_update_policy
  ON certificate_templates
  FOR UPDATE
  USING (check_is_admin());

CREATE POLICY certificate_templates_delete_policy
  ON certificate_templates
  FOR DELETE
  USING (check_is_admin());

-- Track this migration
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES ('migration_20250622_certificate_templates', jsonb_build_object('applied_at', NOW()))
ON CONFLICT (key) DO UPDATE
SET value = jsonb_build_object('applied_at', NOW()),
    updated_at = NOW();
