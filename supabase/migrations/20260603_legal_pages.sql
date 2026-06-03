-- Legal Pages CMS
-- Stores editable internal legal pages such as terms, privacy, and cookies.

CREATE TABLE IF NOT EXISTS legal_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT legal_pages_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published legal pages" ON legal_pages;
DROP POLICY IF EXISTS "Admins can read legal pages" ON legal_pages;
DROP POLICY IF EXISTS "Admins can manage legal pages" ON legal_pages;

CREATE POLICY "Anyone can read published legal pages"
    ON legal_pages FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can read legal pages"
    ON legal_pages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'faculty')
        )
    );

CREATE POLICY "Admins can manage legal pages"
    ON legal_pages FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'faculty')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'faculty')
        )
    );

CREATE INDEX IF NOT EXISTS idx_legal_pages_slug ON legal_pages(slug);
CREATE INDEX IF NOT EXISTS idx_legal_pages_published ON legal_pages(is_published);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_legal_pages_updated_at ON legal_pages;
CREATE TRIGGER update_legal_pages_updated_at
    BEFORE UPDATE ON legal_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO legal_pages (slug, title, content, is_published)
VALUES
(
    'terms',
    'Terms and Conditions',
    '1. Introduction

Welcome to the CME Platform. These terms and conditions outline the rules and regulations for the use of our platform.

2. Acceptance of Terms

By accessing or using our platform, you agree to be bound by these terms and conditions. If you disagree with any part of these terms, you may not access the platform.

3. User Registration

To use certain features of the platform, you must register and provide accurate professional information. You are responsible for maintaining the confidentiality of your account information.

4. Professional Conduct

As a medical professional using this platform, you agree to maintain professional standards and ethics in all interactions and content shared through the platform.

5. Content Usage

Educational content provided through the platform is for professional development purposes only. Unauthorized distribution or reproduction of content is prohibited.

6. Changes to Terms

We reserve the right to modify these terms at any time. Your continued use of the platform following any changes constitutes acceptance of those changes.',
    true
),
(
    'privacy',
    'Privacy Policy',
    '1. Information We Collect

We collect personal and professional information that you provide during registration, including your name, email address, professional credentials, and contact information.

2. How We Use Your Information

We use your information to provide and improve our services, verify your professional credentials, and communicate with you about educational opportunities and platform updates.

3. Data Security

We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.

4. Information Sharing

We do not sell or rent your personal information to third parties. We may share information with service providers who help us operate the platform or as required by law.

5. Your Rights

You have the right to access, correct, or delete your personal information. You may also request a copy of the personal data we hold about you.

6. Changes to Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.',
    true
),
(
    'cookies',
    'Cookie Policy',
    '1. Cookie Usage

This platform may use cookies and similar technologies to keep users signed in, protect sessions, understand site usage, and improve the user experience.

2. Managing Cookies

You can manage cookie preferences through your browser settings. Some platform features may not work correctly if required cookies are disabled.',
    true
)
ON CONFLICT (slug) DO NOTHING;

UPDATE footer_links
SET href = '/legal/privacy', opens_new_tab = false
WHERE href = '/privacy' OR lower(name) = 'privacy policy';

UPDATE footer_links
SET href = '/legal/terms', opens_new_tab = false
WHERE href = '/terms' OR lower(name) IN ('terms of service', 'terms and conditions');

UPDATE footer_links
SET href = '/legal/cookies', opens_new_tab = false
WHERE href = '/cookies' OR lower(name) = 'cookie policy';
