CREATE TABLE public.manual_course_requests (
 user_id uuid NOT NULL,
 request_id uuid NOT NULL,
 cours_id uuid NOT NULL REFERENCES public.cours(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,request_id)
);
GRANT ALL ON public.manual_course_requests TO service_role;
ALTER TABLE public.manual_course_requests ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.saisir_cours_manuel_unique(_request_id uuid,_enfant_id uuid,_date date,_debut time,_fin time,_matiere text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid; _uid uuid := auth.uid();
BEGIN
 IF _uid IS NULL OR NOT public.maitre_suit_enfant(_enfant_id) THEN RAISE EXCEPTION 'non autorise'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text||_request_id::text,0));
 SELECT cours_id INTO _id FROM public.manual_course_requests WHERE user_id=_uid AND request_id=_request_id;
 IF _id IS NOT NULL THEN RETURN _id; END IF;
 _id := public.saisir_cours_manuel(_enfant_id,_date,_debut,_fin,_matiere);
 INSERT INTO public.manual_course_requests(user_id,request_id,cours_id) VALUES(_uid,_request_id,_id);
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.saisir_cours_manuel_unique(uuid,uuid,date,time,time,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.saisir_cours_manuel_unique(uuid,uuid,date,time,time,text) TO authenticated;