ALTER TABLE public.cours
  ADD COLUMN IF NOT EXISTS debut_reel timestamptz,
  ADD COLUMN IF NOT EXISTS fin_reelle timestamptz,
  ADD COLUMN IF NOT EXISTS saisie_manuelle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_lat double precision,
  ADD COLUMN IF NOT EXISTS gps_lng double precision,
  ADD COLUMN IF NOT EXISTS distance_m numeric,
  ADD COLUMN IF NOT EXISTS position_incoherente boolean NOT NULL DEFAULT false;

ALTER TABLE public.familles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

DROP POLICY IF EXISTS cours_maitre_insert ON public.cours;
CREATE POLICY cours_maitre_insert ON public.cours
  FOR INSERT TO authenticated
  WITH CHECK (maitre_id = public.current_maitre_id() AND public.maitre_suit_enfant(enfant_id));