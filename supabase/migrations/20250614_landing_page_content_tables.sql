-- Migration for landing page content management
-- This migration creates tables for storing dynamic content for the landing page

-- Table for hero section content
CREATE TABLE IF NOT EXISTS landing_hero (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_primary_text TEXT NOT NULL,
  cta_secondary_text TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for features section
CREATE TABLE IF NOT EXISTS landing_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for testimonials section
CREATE TABLE IF NOT EXISTS landing_testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  content TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for statistics section
CREATE TABLE IF NOT EXISTS landing_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for call-to-action section
CREATE TABLE IF NOT EXISTS landing_cta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  button_primary_text TEXT NOT NULL,
  button_secondary_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for general settings
CREATE TABLE IF NOT EXISTS landing_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  contact_email TEXT,
  social_links JSONB DEFAULT '{}',
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS policies
ALTER TABLE landing_hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_cta ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY admin_landing_hero ON landing_hero 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY admin_landing_features ON landing_features 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY admin_landing_testimonials ON landing_testimonials 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY admin_landing_stats ON landing_stats 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY admin_landing_cta ON landing_cta 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY admin_landing_settings ON landing_settings 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create policies for public read access
CREATE POLICY public_read_landing_hero ON landing_hero 
  FOR SELECT USING (true);

CREATE POLICY public_read_landing_features ON landing_features 
  FOR SELECT USING (true);

CREATE POLICY public_read_landing_testimonials ON landing_testimonials 
  FOR SELECT USING (true);

CREATE POLICY public_read_landing_stats ON landing_stats 
  FOR SELECT USING (true);

CREATE POLICY public_read_landing_cta ON landing_cta 
  FOR SELECT USING (true);

CREATE POLICY public_read_landing_settings ON landing_settings 
  FOR SELECT USING (true);

-- Insert initial data based on current landing page content
INSERT INTO landing_hero (title, subtitle, cta_primary_text, cta_secondary_text)
VALUES (
  'Continuing Medical Education Made Simple',
  'Access high-quality medical webinars, track your credits, and manage your professional development all in one place.',
  'Get Started',
  'Learn More'
);

INSERT INTO landing_features (title, description, icon, order_index)
VALUES 
  ('Live Webinars', 'Join interactive medical webinars led by industry experts', 'Video', 1),
  ('Attendance Tracking', 'Automated attendance verification with admin approval', 'ClipboardCheck', 2),
  ('Credit System', 'Earn and track CME credits for your professional development', 'Award', 3),
  ('Digital Certificates', 'Receive verifiable digital certificates for completed courses', 'FileText', 4);

INSERT INTO landing_testimonials (name, role, company, content, rating, order_index)
VALUES 
  ('Dr. Sarah Johnson', 'Cardiologist', 'Heart Care Center', 'This platform has revolutionized how I complete my required CME credits. The webinars are informative and the certificate system is seamless.', 5, 1),
  ('Dr. Michael Chen', 'Pediatrician', 'Children''s Medical Group', 'The quality of education and ease of tracking my credits has made this my go-to platform for continuing education.', 5, 2),
  ('Dr. Lisa Rodriguez', 'Neurologist', 'Neuroscience Institute', 'I appreciate how easy it is to join webinars and have my attendance automatically tracked. Highly recommended!', 4, 3);

INSERT INTO landing_stats (title, value, icon, order_index)
VALUES 
  ('Medical Professionals', '5,000+', 'User', 1),
  ('Webinars Completed', '1,200+', 'Video', 2),
  ('CME Credits Awarded', '25,000+', 'Award', 3),
  ('Satisfaction Rate', '98%', 'ThumbsUp', 4);

INSERT INTO landing_cta (title, description, button_primary_text, button_secondary_text)
VALUES (
  'Ready to Simplify Your CME Journey?',
  'Join thousands of medical professionals who are already managing their continuing education with our platform.',
  'Sign Up Now',
  'Contact Us'
);

INSERT INTO landing_settings (site_title, meta_description, footer_text)
VALUES (
  'CME Platform | Continuing Medical Education',
  'Streamline your continuing medical education with our comprehensive platform for webinars, credit tracking, and digital certificates.',
  '© 2025 CME Platform. All rights reserved.'
);
