BEGIN;

-- Enums (lowercase snake_case labels)
CREATE TYPE public.build_status AS ENUM ('draft', 'published');
CREATE TYPE public.watch_style AS ENUM (
  'diver',
  'field',
  'dress',
  'gmt',
  'pilot',
  'integrated',
  'other'
);
CREATE TYPE public.movement AS ENUM (
  'nh35',
  'nh36',
  'nh34',
  'miyota_8215',
  'other'
);
CREATE TYPE public.dial_colour AS ENUM (
  'black',
  'white',
  'blue',
  'green',
  'silver',
  'other'
);
CREATE TYPE public.strap_type AS ENUM (
  'leather',
  'nato',
  'rubber',
  'steel_bracelet',
  'other'
);
CREATE TYPE public.hands_style AS ENUM (
  'mercedes',
  'sword',
  'dauphine',
  'baton',
  'other'
);
CREATE TYPE public.part_category AS ENUM (
  'movement',
  'case',
  'dial',
  'hands',
  'bezel',
  'crystal',
  'strap',
  'bracelet',
  'other'
);

GRANT USAGE ON TYPE public.build_status TO anon, authenticated;
GRANT USAGE ON TYPE public.watch_style TO anon, authenticated;
GRANT USAGE ON TYPE public.movement TO anon, authenticated;
GRANT USAGE ON TYPE public.dial_colour TO anon, authenticated;
GRANT USAGE ON TYPE public.strap_type TO anon, authenticated;
GRANT USAGE ON TYPE public.hands_style TO anon, authenticated;
GRANT USAGE ON TYPE public.part_category TO anon, authenticated;

-- builds
CREATE TABLE public.builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status public.build_status NOT NULL DEFAULT 'draft',
  name text CHECK (name IS NULL OR char_length(name) <= 120),
  story text CHECK (story IS NULL OR char_length(story) <= 4000),
  watch_style public.watch_style,
  movement public.movement,
  dial_colour public.dial_colour,
  strap_type public.strap_type,
  hands_style public.hands_style,
  case_size_mm integer CHECK (
    case_size_mm IS NULL
    OR (case_size_mm >= 20 AND case_size_mm <= 70)
  ),
  main_image_path text CHECK (
    main_image_path IS NULL
    OR (
      char_length(main_image_path) <= 512
      AND main_image_path LIKE (author_id::text || '/' || id::text || '/%')
    )
  ),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX builds_author_id_idx ON public.builds (author_id);

-- build_parts
CREATE TABLE public.build_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL REFERENCES public.builds (id) ON DELETE CASCADE,
  category public.part_category NOT NULL,
  name text NOT NULL CHECK (char_length(name) <= 120),
  product_url text CHECK (
    product_url IS NULL
    OR char_length(product_url) <= 2048
  ),
  price_amount_minor integer CHECK (
    price_amount_minor IS NULL
    OR price_amount_minor >= 0
  ),
  currency char(3) CHECK (
    currency IS NULL
    OR currency ~ '^[A-Z]{3}$'
  ),
  position integer NOT NULL CHECK (position >= 0),
  CONSTRAINT build_parts_price_currency_pair CHECK (
    (price_amount_minor IS NULL) = (currency IS NULL)
  ),
  CONSTRAINT build_parts_build_id_position_key UNIQUE (build_id, position)
);

CREATE INDEX build_parts_build_id_idx ON public.build_parts (build_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER builds_set_updated_at
BEFORE UPDATE ON public.builds
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- First publish sets published_at once; later updates cannot clear or replace it
CREATE OR REPLACE FUNCTION public.set_build_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL THEN
    NEW.published_at = OLD.published_at;
  ELSIF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER builds_set_published_at
BEFORE INSERT OR UPDATE OF status, published_at ON public.builds
FOR EACH ROW
EXECUTE FUNCTION public.set_build_published_at();

-- RLS
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_parts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.builds FROM PUBLIC;
REVOKE ALL ON TABLE public.build_parts FROM PUBLIC;

GRANT SELECT ON TABLE public.builds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.builds TO authenticated;

GRANT SELECT ON TABLE public.build_parts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.build_parts TO authenticated;

CREATE POLICY builds_select ON public.builds
FOR SELECT
USING (
  status = 'published'
  OR author_id = auth.uid()
);

CREATE POLICY builds_insert ON public.builds
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND status = 'draft'
);

CREATE POLICY builds_update ON public.builds
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY builds_delete ON public.builds
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY build_parts_select ON public.build_parts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = build_parts.build_id
      AND (
        b.status = 'published'
        OR b.author_id = auth.uid()
      )
  )
);

CREATE POLICY build_parts_insert ON public.build_parts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = build_parts.build_id
      AND b.author_id = auth.uid()
  )
);

CREATE POLICY build_parts_update ON public.build_parts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = build_parts.build_id
      AND b.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = build_parts.build_id
      AND b.author_id = auth.uid()
  )
);

CREATE POLICY build_parts_delete ON public.build_parts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = build_parts.build_id
      AND b.author_id = auth.uid()
  )
);

-- Private storage bucket for build main images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'build-images',
  'build-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Path is {author_id}/{build_id}/main.{ext}. Ownership is inlined so Storage
-- write policies run as invoker against public.builds (no SECURITY DEFINER helper).
-- Qualify storage.objects.name: inside EXISTS, unqualified `name` binds to builds.name.
CREATE POLICY build_images_insert ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'build-images'
  AND EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = (storage.foldername(storage.objects.name))[2]::uuid
      AND b.author_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  )
);

CREATE POLICY build_images_update ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'build-images'
  AND EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = (storage.foldername(storage.objects.name))[2]::uuid
      AND b.author_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'build-images'
  AND EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = (storage.foldername(storage.objects.name))[2]::uuid
      AND b.author_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  )
);

CREATE POLICY build_images_delete ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'build-images'
  AND EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.id = (storage.foldername(storage.objects.name))[2]::uuid
      AND b.author_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  )
);

CREATE POLICY build_images_select_owner ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'build-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY build_images_select_published ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'build-images'
  AND EXISTS (
    SELECT 1
    FROM public.builds b
    WHERE b.status = 'published'
      AND b.main_image_path = storage.objects.name
      AND (storage.foldername(storage.objects.name))[1] = b.author_id::text
      AND (storage.foldername(storage.objects.name))[2]::uuid = b.id
  )
);

COMMIT;
