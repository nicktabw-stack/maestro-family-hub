CREATE TABLE public.cours_positions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cours_id uuid NOT NULL REFERENCES public.cours(id) ON DELETE CASCADE,
 phase text NOT NULL CHECK (phase IN ('debut','fin','manuel')),
 latitude double precision, longitude double precision, precision_m double precision,
 distance_m double precision, niveau text NOT NULL CHECK(niveau IN ('vert','orange','rouge','gris')),
 raison text, capture_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cours_id,phase)
);
GRANT SELECT ON public.cours_positions TO authenticated;
GRANT ALL ON public.cours_positions TO service_role;
ALTER TABLE public.cours_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY positions_admin_select ON public.cours_positions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.alertes ADD COLUMN cours_id uuid REFERENCES public.cours(id) ON DELETE CASCADE;
ALTER TABLE public.alertes ADD COLUMN verifie_at timestamptz;
ALTER TABLE public.alertes ADD COLUMN verifie_par uuid;
CREATE FUNCTION public.niveau_position(_distance double precision,_precision double precision) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN _distance IS NULL THEN 'gris' WHEN _distance>500 THEN 'rouge' WHEN _distance>=200 OR _precision>200 THEN 'orange' ELSE 'vert' END
$$;
INSERT INTO public.cours_positions(cours_id,phase,latitude,longitude,distance_m,niveau,raison,capture_at)
 SELECT id,CASE WHEN saisie_manuelle THEN 'manuel' ELSE 'debut' END,gps_lat,gps_lng,distance_m,
 public.niveau_position(distance_m::double precision,NULL),
 CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 'Position non disponible (ancien pointage)' WHEN distance_m IS NULL THEN 'Domicile non enregistré lors du pointage' ELSE 'Précision GPS non enregistrée (ancien pointage)' END,created_at
 FROM public.cours;
WITH matches AS (
 SELECT a.id,(SELECT c.id FROM public.cours c JOIN public.enfants e ON e.id=c.enfant_id WHERE c.position_incoherente AND c.maitre_id=a.maitre_id AND e.famille_id=a.famille_id ORDER BY abs(extract(epoch FROM c.created_at-a.created_at)) LIMIT 1) AS cid
 FROM public.alertes a WHERE a.type='Position incohérente'
), ranked AS (
 SELECT id,cid,row_number() OVER(PARTITION BY cid ORDER BY id) AS n FROM matches WHERE cid IS NOT NULL
)
UPDATE public.alertes a SET cours_id=CASE WHEN r.n=1 THEN r.cid ELSE NULL END,lue=CASE WHEN r.n=1 THEN false ELSE true END FROM ranked r WHERE a.id=r.id;
CREATE UNIQUE INDEX alertes_position_cours_unique ON public.alertes(cours_id) WHERE type='Position incohérente' AND cours_id IS NOT NULL;
INSERT INTO public.alertes(type,message,severite,maitre_id,famille_id,cours_id)
 SELECT 'Position incohérente','Pointage à '||round(p.distance_m::numeric)||' m du domicile','danger',c.maitre_id,e.famille_id,c.id
 FROM public.cours_positions p JOIN public.cours c ON c.id=p.cours_id JOIN public.enfants e ON e.id=c.enfant_id WHERE p.niveau='rouge'
 ON CONFLICT(cours_id) WHERE type='Position incohérente' AND cours_id IS NOT NULL DO NOTHING;
REVOKE SELECT ON public.cours FROM authenticated,anon;
REVOKE SELECT(gps_lat,gps_lng,distance_m,position_incoherente) ON public.cours FROM authenticated,anon;
GRANT SELECT(id,enfant_id,maitre_id,maitre_remplacant_id,date_cours,heure_debut,heure_fin,matiere,statut,compte_rendu,created_at,updated_at,debut_reel,fin_reelle,saisie_manuelle,confirme_famille,confirme_famille_at) ON public.cours TO authenticated;
COMMENT ON COLUMN public.cours.gps_lat IS 'DEPRECATED: replaced by admin-only cours_positions.latitude';
COMMENT ON COLUMN public.cours.gps_lng IS 'DEPRECATED: replaced by admin-only cours_positions.longitude';
COMMENT ON COLUMN public.cours.distance_m IS 'DEPRECATED: replaced by admin-only cours_positions.distance_m';
COMMENT ON COLUMN public.cours.position_incoherente IS 'DEPRECATED: replaced by admin-only cours_positions.niveau';
CREATE OR REPLACE FUNCTION public.demarrer_cours(_enfant_id uuid,_lat double precision,_lng double precision,_matiere text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _mid uuid:=public.current_maitre_id(); _id uuid;
BEGIN
 IF _mid IS NULL OR NOT public.maitre_suit_enfant(_enfant_id) THEN RAISE EXCEPTION 'non autorise'; END IF;
 INSERT INTO public.cours(enfant_id,maitre_id,date_cours,heure_debut,heure_fin,matiere,statut,debut_reel,saisie_manuelle)
 VALUES(_enfant_id,_mid,CURRENT_DATE,localtime,localtime,_matiere,'planifie',now(),false) RETURNING id INTO _id;
 RETURN _id;
END $$;
CREATE FUNCTION public.enregistrer_position_cours(_cours uuid,_phase text,_position jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _lat double precision; _lng double precision; _precision double precision; _dist double precision; _niveau text; _raison text; _home record; _coursrow record;
BEGIN
 SELECT * INTO _coursrow FROM public.cours WHERE id=_cours;
 SELECT f.latitude,f.longitude,f.id INTO _home FROM public.enfants e JOIN public.familles f ON f.id=e.famille_id WHERE e.id=_coursrow.enfant_id;
 _lat:=(_position->>'lat')::double precision; _lng:=(_position->>'lng')::double precision; _precision:=(_position->>'accuracy')::double precision;
 IF _lat IS NULL OR _lng IS NULL OR _precision IS NULL OR NOT (_lat BETWEEN -90 AND 90) OR NOT (_lng BETWEEN -180 AND 180) OR NOT (_precision>=0 AND _precision<='10000000'::double precision) THEN
  _lat:=NULL; _lng:=NULL; _precision:=NULL;
  _raison:=CASE _position->>'reason' WHEN 'permission-denied' THEN 'Localisation refusée' WHEN 'timeout' THEN 'Délai de localisation dépassé' WHEN 'unsupported' THEN 'Localisation non prise en charge' ELSE 'Position non disponible' END;
 END IF;
 IF _home.latitude IS NULL OR _home.longitude IS NULL THEN
  _raison:=concat_ws(' · ',_raison,'Domicile non enregistré');
 ELSIF _lat IS NOT NULL THEN
  _dist:=6371000*acos(least(1,greatest(-1,cos(radians(_lat))*cos(radians(_home.latitude))*cos(radians(_home.longitude)-radians(_lng))+sin(radians(_lat))*sin(radians(_home.latitude)))));
 END IF;
 _niveau:=public.niveau_position(_dist,_precision);
 INSERT INTO public.cours_positions(cours_id,phase,latitude,longitude,precision_m,distance_m,niveau,raison)
 VALUES(_cours,_phase,_lat,_lng,_precision,_dist,_niveau,_raison) ON CONFLICT(cours_id,phase) DO NOTHING;
 IF FOUND AND _niveau='rouge' THEN
  INSERT INTO public.alertes(type,message,severite,maitre_id,famille_id,cours_id)
  VALUES('Position incohérente','Pointage à '||round(_dist::numeric)||' m du domicile','danger',_coursrow.maitre_id,_home.id,_cours)
  ON CONFLICT(cours_id) WHERE type='Position incohérente' AND cours_id IS NOT NULL DO NOTHING;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.enregistrer_position_cours(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.pointer_cours(_action text,_position jsonb,_enfant_id uuid DEFAULT NULL,_cours_id uuid DEFAULT NULL,_request_id uuid DEFAULT NULL,_date date DEFAULT NULL,_debut time DEFAULT NULL,_fin time DEFAULT NULL,_matiere text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid; _done timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non autorise'; END IF;
 IF _action='debut' THEN
  IF NOT public.maitre_suit_enfant(_enfant_id) THEN RAISE EXCEPTION 'non autorise'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(public.current_maitre_id()::text||_enfant_id::text,0));
  SELECT id INTO _id FROM public.cours WHERE maitre_id=public.current_maitre_id() AND enfant_id=_enfant_id AND debut_reel IS NOT NULL AND fin_reelle IS NULL LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  _id:=public.demarrer_cours(_enfant_id,NULL,NULL,_matiere);
 ELSIF _action='fin' THEN
  SELECT id,fin_reelle INTO _id,_done FROM public.cours WHERE id=_cours_id AND maitre_id=public.current_maitre_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'non autorise'; END IF;
  IF _done IS NOT NULL THEN RETURN _id; END IF;
  PERFORM public.terminer_cours(_id);
 ELSIF _action='manuel' THEN
  IF _request_id IS NULL OR _date IS NULL OR _debut IS NULL OR _fin IS NULL OR _fin<=_debut THEN RAISE EXCEPTION 'horaires invalides'; END IF;
  _id:=public.saisir_cours_manuel_unique(_request_id,_enfant_id,_date,_debut,_fin,_matiere);
 ELSE RAISE EXCEPTION 'action invalide'; END IF;
 PERFORM public.enregistrer_position_cours(_id,_action,_position);
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.pointer_cours(text,jsonb,uuid,uuid,uuid,date,time,time,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pointer_cours(text,jsonb,uuid,uuid,uuid,date,time,time,text) TO authenticated;
CREATE FUNCTION public.verifier_position_cours(_cours_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'non autorise'; END IF;
 UPDATE public.alertes SET lue=true,verifie_at=now(),verifie_par=auth.uid() WHERE cours_id=_cours_id AND type='Position incohérente' AND verifie_at IS NULL;
 IF NOT FOUND AND NOT EXISTS(SELECT 1 FROM public.alertes WHERE cours_id=_cours_id AND type='Position incohérente' AND verifie_at IS NOT NULL) THEN RAISE EXCEPTION 'alerte introuvable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.verifier_position_cours(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verifier_position_cours(uuid) TO authenticated;