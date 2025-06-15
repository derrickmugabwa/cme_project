-- Add button_secondary_text column to landing_cta table
ALTER TABLE landing_cta ADD COLUMN IF NOT EXISTS button_secondary_text TEXT;

-- Copy data from secondary_button_text to button_secondary_text
UPDATE landing_cta SET button_secondary_text = secondary_button_text WHERE secondary_button_text IS NOT NULL;
