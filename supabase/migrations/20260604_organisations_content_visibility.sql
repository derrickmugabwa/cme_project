-- Add organisation management and organisation-scoped educational content.

CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organisations_name_unique_idx
  ON public.organisations (LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS organisations_status_idx
  ON public.organisations(status);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;

ALTER TABLE public.educational_content
ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_organisation_id
  ON public.profiles(organisation_id);

CREATE INDEX IF NOT EXISTS idx_educational_content_organisation_id
  ON public.educational_content(organisation_id);

INSERT INTO public.organisations (name, status)
SELECT MIN(TRIM(institution)), 'active'
FROM public.profiles
WHERE institution IS NOT NULL
  AND TRIM(institution) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.organisations existing
    WHERE LOWER(TRIM(existing.name)) = LOWER(TRIM(public.profiles.institution))
  )
GROUP BY LOWER(TRIM(institution));

UPDATE public.profiles p
SET organisation_id = o.id
FROM public.organisations o
WHERE p.organisation_id IS NULL
  AND p.institution IS NOT NULL
  AND LOWER(TRIM(p.institution)) = LOWER(TRIM(o.name));

CREATE OR REPLACE FUNCTION public.prevent_profile_organisation_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.organisation_id IS DISTINCT FROM NEW.organisation_id
     AND public.get_user_role(auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can change a profile organisation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_profile_organisation_change ON public.profiles;
CREATE TRIGGER prevent_profile_organisation_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_organisation_change();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_organisations_updated_at ON public.organisations;
CREATE TRIGGER touch_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organisations are visible to signup and members" ON public.organisations;
CREATE POLICY "Organisations are visible to signup and members"
  ON public.organisations FOR SELECT
  USING (
    status = 'active'
    OR public.get_user_role(auth.uid()) = 'admin'
    OR created_by = auth.uid()
    OR id = (
      SELECT profiles.organisation_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can create organisations" ON public.organisations;
CREATE POLICY "Admins can create organisations"
  ON public.organisations FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update organisations" ON public.organisations;
CREATE POLICY "Admins can update organisations"
  ON public.organisations FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete organisations" ON public.organisations;
CREATE POLICY "Admins can delete organisations"
  ON public.organisations FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

GRANT SELECT ON public.organisations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organisations TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_organisation_id UUID;
  resolved_organisation_id UUID;
  other_organisation_name TEXT;
  resolved_institution TEXT;
BEGIN
  RAISE LOG 'handle_new_user called for user: %', NEW.id;
  RAISE LOG 'User email: %', NEW.email;
  RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;

  other_organisation_name := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'organisation_name_other',
    NEW.raw_user_meta_data->>'organization_name_other',
    ''
  )), '');

  IF COALESCE(NEW.raw_user_meta_data->>'organisation_id', NEW.raw_user_meta_data->>'organization_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    selected_organisation_id := COALESCE(
      NEW.raw_user_meta_data->>'organisation_id',
      NEW.raw_user_meta_data->>'organization_id'
    )::UUID;

    SELECT id INTO resolved_organisation_id
    FROM public.organisations
    WHERE id = selected_organisation_id
      AND status <> 'disabled';
  END IF;

  IF resolved_organisation_id IS NULL AND other_organisation_name IS NOT NULL THEN
    SELECT id INTO resolved_organisation_id
    FROM public.organisations
    WHERE LOWER(TRIM(name)) = LOWER(other_organisation_name);

    IF resolved_organisation_id IS NULL THEN
      BEGIN
        INSERT INTO public.organisations (name, status, created_by)
        VALUES (other_organisation_name, 'pending', NEW.id)
        RETURNING id INTO resolved_organisation_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO resolved_organisation_id
        FROM public.organisations
        WHERE LOWER(TRIM(name)) = LOWER(other_organisation_name);
      END;
    END IF;
  END IF;

  SELECT name INTO resolved_institution
  FROM public.organisations
  WHERE id = resolved_organisation_id;

  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      role,
      full_name,
      first_name,
      middle_name,
      surname,
      title,
      id_number,
      country,
      phone_number,
      professional_cadre,
      registration_number,
      professional_board,
      institution,
      organisation_id,
      accepted_terms
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'user'::public.user_role),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'middle_name',
      NEW.raw_user_meta_data->>'surname',
      NEW.raw_user_meta_data->>'title',
      NEW.raw_user_meta_data->>'id_number',
      NEW.raw_user_meta_data->>'country',
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'professional_cadre',
      NEW.raw_user_meta_data->>'registration_number',
      NEW.raw_user_meta_data->>'professional_board',
      COALESCE(resolved_institution, NEW.raw_user_meta_data->>'institution', other_organisation_name),
      resolved_organisation_id,
      COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, false)
    );

    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
    RAISE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can see published content" ON public.educational_content;
DROP POLICY IF EXISTS "Content visibility policy" ON public.educational_content;
DROP POLICY IF EXISTS "Faculty can view their own content" ON public.educational_content;

CREATE POLICY "Content visibility policy"
  ON public.educational_content FOR SELECT
  TO authenticated
  USING (
    auth.uid() = faculty_id
    OR public.get_user_role(auth.uid()) = 'admin'
    OR (
      is_published = true
      AND (
        organisation_id IS NULL
        OR organisation_id = (
          SELECT profiles.organisation_id
          FROM public.profiles
          WHERE profiles.id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can download content they have access to" ON storage.objects;

CREATE POLICY "Users can download content they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND (
      public.get_user_role(auth.uid()) = 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.educational_content ec
        WHERE ec.file_path = name
          AND (
            ec.faculty_id = auth.uid()
            OR (
              ec.is_published = true
              AND (
                ec.organisation_id IS NULL
                OR ec.organisation_id = (
                  SELECT profiles.organisation_id
                  FROM public.profiles
                  WHERE profiles.id = auth.uid()
                )
              )
            )
          )
      )
    )
  );
