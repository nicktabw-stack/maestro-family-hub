CREATE OR REPLACE FUNCTION public.demarrer_cours(_enfant_id uuid, _lat double precision, _lng double precision, _matiere text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _maitre_id uuid;
  _famille RECORD;
  _dist numeric;
  _incoherent boolean := false;
  _id uuid;
BEGIN
  _maitre_id := public.current_maitre_id();
  IF _maitre_id IS NULL OR NOT public.maitre_suit_enfant(_enfant_id) THEN
    RAISE EXCEPTION 'non autorise';
  END IF;

  SELECT f.id, f.nom, f.latitude, f.longitude INTO _famille
  FROM public.enfants e JOIN public.familles f ON f.id = e.famille_id
  WHERE e.id = _enfant_id;

  IF _lat IS NOT NULL AND _lng IS NOT NULL AND _famille.latitude IS NOT NULL AND _famille.longitude IS NOT NULL THEN
    _dist := 6371000 * acos(
      least(1, greatest(-1,
        cos(radians(_lat)) * cos(radians(_famille.latitude)) * cos(radians(_famille.longitude) - radians(_lng))
        + sin(radians(_lat)) * sin(radians(_famille.latitude))
      ))
    );
    _incoherent := _dist > 500;
  END IF;

  INSERT INTO public.cours (enfant_id, maitre_id, date_cours, heure_debut, heure_fin, matiere, statut,
                            debut_reel, gps_lat, gps_lng, distance_m, position_incoherente, saisie_manuelle)
  VALUES (_enfant_id, _maitre_id, CURRENT_DATE, localtime, localtime, _matiere, 'planifie',
          now(), _lat, _lng, _dist, _incoherent, false)
  RETURNING id INTO _id;

  IF _incoherent THEN
    INSERT INTO public.alertes (type, message, severite, maitre_id, famille_id)
    VALUES ('Position incohérente',
            'Pointage à ' || round(_dist) || ' m du domicile de la famille ' || coalesce(_famille.nom, ''),
            'danger', _maitre_id, _famille.id);
  END IF;

  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.terminer_cours(_cours_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cours
  SET fin_reelle = now(), heure_fin = localtime, statut = 'effectue'
  WHERE id = _cours_id AND maitre_id = public.current_maitre_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'non autorise'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.saisir_cours_manuel(_enfant_id uuid, _date date, _debut time, _fin time, _matiere text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _maitre_id uuid; _id uuid;
BEGIN
  _maitre_id := public.current_maitre_id();
  IF _maitre_id IS NULL OR NOT public.maitre_suit_enfant(_enfant_id) THEN
    RAISE EXCEPTION 'non autorise';
  END IF;
  INSERT INTO public.cours (enfant_id, maitre_id, date_cours, heure_debut, heure_fin, matiere, statut,
                            debut_reel, fin_reelle, saisie_manuelle)
  VALUES (_enfant_id, _maitre_id, _date, _debut, _fin, _matiere, 'effectue',
          (_date + _debut) AT TIME ZONE 'UTC', (_date + _fin) AT TIME ZONE 'UTC', true)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;