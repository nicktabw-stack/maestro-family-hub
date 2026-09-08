
CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email TEXT;
BEGIN
  SELECT lower(u.email) INTO _email FROM auth.users u WHERE u.id = auth.uid();
  IF _email IS NULL THEN RETURN false; END IF;
  IF _email <> 'nicktabw@gmail.com' THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;
