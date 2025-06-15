-- Add button_primary_text column to landing_cta table
ALTER TABLE landing_cta ADD COLUMN IF NOT EXISTS button_primary_text TEXT;

-- Copy data from primary_button_text to button_primary_text
UPDATE landing_cta SET button_primary_text = primary_button_text WHERE primary_button_text IS NOT NULL;
