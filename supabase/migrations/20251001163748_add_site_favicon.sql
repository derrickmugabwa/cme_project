-- Create site_favicon table
CREATE TABLE IF NOT EXISTS public.site_favicon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    alt_text TEXT DEFAULT 'Site Favicon',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.site_favicon ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view favicon"
    ON public.site_favicon
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert favicon"
    ON public.site_favicon
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can update favicon"
    ON public.site_favicon
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete favicon"
    ON public.site_favicon
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger
CREATE TRIGGER update_site_favicon_updated_at
    BEFORE UPDATE ON public.site_favicon
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
