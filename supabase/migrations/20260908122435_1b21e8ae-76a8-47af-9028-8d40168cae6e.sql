
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_famille_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_maitre_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.maitre_suit_enfant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_famille_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_maitre_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.maitre_suit_enfant(uuid) TO authenticated, service_role;
