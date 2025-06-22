-- Add body_line_spacing column to certificate_templates table
ALTER TABLE certificate_templates
ADD COLUMN IF NOT EXISTS body_line_spacing INTEGER DEFAULT 8;

-- Add comment to the column
COMMENT ON COLUMN certificate_templates.body_line_spacing IS 'Controls the spacing between lines in body paragraphs (in pixels)';

-- Update existing templates to have the default line spacing
UPDATE certificate_templates
SET body_line_spacing = 8
WHERE body_line_spacing IS NULL;
