REVOKE ALL ON FUNCTION public.demarrer_cours(uuid, double precision, double precision, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.terminer_cours(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.saisir_cours_manuel(uuid, date, time, time, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demarrer_cours(uuid, double precision, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminer_cours(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saisir_cours_manuel(uuid, date, time, time, text) TO authenticated;