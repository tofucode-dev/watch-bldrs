BEGIN;

CREATE OR REPLACE FUNCTION public.save_draft_build(
  p_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_story text DEFAULT NULL,
  p_watch_style public.watch_style DEFAULT NULL,
  p_movement public.movement DEFAULT NULL,
  p_dial_colour public.dial_colour DEFAULT NULL,
  p_strap_type public.strap_type DEFAULT NULL,
  p_hands_style public.hands_style DEFAULT NULL,
  p_case_size_mm integer DEFAULT NULL,
  p_parts jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_author_id uuid := auth.uid();
  v_build_id uuid;
  v_parts jsonb := COALESCE(p_parts, '[]'::jsonb);
BEGIN
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.jsonb_typeof(v_parts) <> 'array' THEN
    RAISE EXCEPTION 'parts must be an array'
      USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.builds (
      author_id,
      status,
      name,
      story,
      watch_style,
      movement,
      dial_colour,
      strap_type,
      hands_style,
      case_size_mm
    )
    VALUES (
      v_author_id,
      'draft',
      NULLIF(btrim(p_name), ''),
      NULLIF(btrim(p_story), ''),
      p_watch_style,
      p_movement,
      p_dial_colour,
      p_strap_type,
      p_hands_style,
      p_case_size_mm
    )
    RETURNING id INTO v_build_id;
  ELSE
    UPDATE public.builds
    SET
      name = NULLIF(btrim(p_name), ''),
      story = NULLIF(btrim(p_story), ''),
      watch_style = p_watch_style,
      movement = p_movement,
      dial_colour = p_dial_colour,
      strap_type = p_strap_type,
      hands_style = p_hands_style,
      case_size_mm = p_case_size_mm
    WHERE id = p_id
      AND author_id = v_author_id
      AND status = 'draft'
    RETURNING id INTO v_build_id;

    IF v_build_id IS NULL THEN
      RAISE EXCEPTION 'draft not found'
        USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.build_parts
    WHERE build_id = v_build_id;
  END IF;

  INSERT INTO public.build_parts (
    build_id,
    category,
    name,
    product_url,
    price_amount_minor,
    currency,
    position
  )
  SELECT
    v_build_id,
    (elem ->> 'category')::public.part_category,
    elem ->> 'name',
    NULLIF(btrim(elem ->> 'product_url'), ''),
    NULLIF(elem ->> 'price_amount_minor', '')::integer,
    NULLIF(btrim(elem ->> 'currency'), ''),
    COALESCE(
      NULLIF(elem ->> 'position', '')::integer,
      (ord::integer - 1)
    )
  FROM pg_catalog.jsonb_array_elements(v_parts) WITH ORDINALITY AS t(elem, ord);

  RETURN v_build_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_draft_build(
  uuid,
  text,
  text,
  public.watch_style,
  public.movement,
  public.dial_colour,
  public.strap_type,
  public.hands_style,
  integer,
  jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.save_draft_build(
  uuid,
  text,
  text,
  public.watch_style,
  public.movement,
  public.dial_colour,
  public.strap_type,
  public.hands_style,
  integer,
  jsonb
) FROM anon;

GRANT EXECUTE ON FUNCTION public.save_draft_build(
  uuid,
  text,
  text,
  public.watch_style,
  public.movement,
  public.dial_colour,
  public.strap_type,
  public.hands_style,
  integer,
  jsonb
) TO authenticated;

COMMIT;
