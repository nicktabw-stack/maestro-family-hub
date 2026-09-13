ALTER TABLE public.cours
  ADD COLUMN IF NOT EXISTS confirme_famille boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirme_famille_at timestamptz;

CREATE OR REPLACE FUNCTION public.confirmer_cours(_cours_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.cours c
    JOIN public.enfants e ON e.id = c.enfant_id
    WHERE c.id = _cours_id
      AND public.is_famille_owner(e.famille_id)
  ) INTO _ok;

  IF NOT _ok THEN
    RAISE EXCEPTION 'non autorise';
  END IF;

  UPDATE public.cours
  SET confirme_famille = true,
      confirme_famille_at = now(),
      updated_at = now()
  WHERE id = _cours_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmer_cours(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.confirmer_cours(uuid) TO authenticated;