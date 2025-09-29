-- Footer Management Tables
-- This migration creates tables for managing footer content and links

-- Create footer_sections table for managing footer link groups
CREATE TABLE IF NOT EXISTS footer_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create footer_links table for individual footer links
CREATE TABLE IF NOT EXISTS footer_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID REFERENCES footer_sections(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    href VARCHAR(500) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    opens_new_tab BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create footer_settings table for general footer configuration
CREATE TABLE IF NOT EXISTS footer_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    footer_text TEXT,
    copyright_text VARCHAR(200),
    show_social_links BOOLEAN DEFAULT true,
    show_legal_links BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE footer_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;

-- Policies for footer_sections
CREATE POLICY "Anyone can read footer sections" ON footer_sections FOR SELECT USING (true);
CREATE POLICY "Admins can manage footer sections" ON footer_sections FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'faculty')
    )
);

-- Policies for footer_links
CREATE POLICY "Anyone can read footer links" ON footer_links FOR SELECT USING (true);
CREATE POLICY "Admins can manage footer links" ON footer_links FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'faculty')
    )
);

-- Policies for footer_settings
CREATE POLICY "Anyone can read footer settings" ON footer_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage footer settings" ON footer_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'faculty')
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_footer_sections_order ON footer_sections(order_index);
CREATE INDEX IF NOT EXISTS idx_footer_links_section ON footer_links(section_id, order_index);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_footer_sections_updated_at BEFORE UPDATE ON footer_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_footer_links_updated_at BEFORE UPDATE ON footer_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_footer_settings_updated_at BEFORE UPDATE ON footer_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default footer data
INSERT INTO footer_sections (title, order_index) VALUES
('Platform', 0),
('Resources', 1),
('Company', 2),
('Legal', 3);

-- Get section IDs for inserting links
DO $$
DECLARE
    platform_id UUID;
    resources_id UUID;
    company_id UUID;
    legal_id UUID;
BEGIN
    SELECT id INTO platform_id FROM footer_sections WHERE title = 'Platform';
    SELECT id INTO resources_id FROM footer_sections WHERE title = 'Resources';
    SELECT id INTO company_id FROM footer_sections WHERE title = 'Company';
    SELECT id INTO legal_id FROM footer_sections WHERE title = 'Legal';

    -- Insert default footer links
    INSERT INTO footer_links (section_id, name, href, order_index) VALUES
    -- Platform links
    (platform_id, 'Features', '#features', 0),
    (platform_id, 'Pricing', '/pricing', 1),
    (platform_id, 'FAQ', '/faq', 2),
    (platform_id, 'Testimonials', '#testimonials', 3),
    
    -- Resources links
    (resources_id, 'Documentation', '/docs', 0),
    (resources_id, 'Webinars', '/webinars', 1),
    (resources_id, 'Blog', '/blog', 2),
    (resources_id, 'Support', '/support', 3),
    
    -- Company links
    (company_id, 'About Us', '/about', 0),
    (company_id, 'Careers', '/careers', 1),
    (company_id, 'Contact', '/contact', 2),
    (company_id, 'Partners', '/partners', 3),
    
    -- Legal links
    (legal_id, 'Privacy Policy', '/privacy', 0),
    (legal_id, 'Terms of Service', '/terms', 1),
    (legal_id, 'Cookie Policy', '/cookies', 2),
    (legal_id, 'GDPR', '/gdpr', 3);
END $$;

-- Insert default footer settings
INSERT INTO footer_settings (footer_text, copyright_text, show_social_links, show_legal_links) VALUES
('Empowering medical professionals through continuous education and innovative learning solutions.', 'All rights reserved.', true, true);
