-- Add signature customization fields to certificate_templates table
ALTER TABLE certificate_templates
ADD COLUMN IF NOT EXISTS signature_left_name VARCHAR DEFAULT 'Richard Barasa',
ADD COLUMN IF NOT EXISTS signature_left_title VARCHAR DEFAULT 'QA Manager Int''l Bv & Lead Trainer',
ADD COLUMN IF NOT EXISTS signature_right_name VARCHAR DEFAULT 'Daniel Obara',
ADD COLUMN IF NOT EXISTS signature_right_title VARCHAR DEFAULT 'SBU HR - International Business',
ADD COLUMN IF NOT EXISTS signature_font VARCHAR DEFAULT 'times',
ADD COLUMN IF NOT EXISTS signature_font_style VARCHAR DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS signature_font_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS signature_color VARCHAR DEFAULT '#000000';

-- Add comments to the columns
COMMENT ON COLUMN certificate_templates.signature_left_name IS 'Name of the left signatory';
COMMENT ON COLUMN certificate_templates.signature_left_title IS 'Title/position of the left signatory';
COMMENT ON COLUMN certificate_templates.signature_right_name IS 'Name of the right signatory';
COMMENT ON COLUMN certificate_templates.signature_right_title IS 'Title/position of the right signatory';
COMMENT ON COLUMN certificate_templates.signature_font IS 'Font for signature text';
COMMENT ON COLUMN certificate_templates.signature_font_style IS 'Font style for signature text';
COMMENT ON COLUMN certificate_templates.signature_font_size IS 'Font size for signature text';
COMMENT ON COLUMN certificate_templates.signature_color IS 'Color for signature text';

-- Update existing templates to have the default signature values
UPDATE certificate_templates
SET 
  signature_left_name = 'Richard Barasa',
  signature_left_title = 'QA Manager Int''l Bv & Lead Trainer',
  signature_right_name = 'Daniel Obara',
  signature_right_title = 'SBU HR - International Business',
  signature_font = 'times',
  signature_font_style = 'normal',
  signature_font_size = 10,
  signature_color = '#000000'
WHERE signature_left_name IS NULL;
