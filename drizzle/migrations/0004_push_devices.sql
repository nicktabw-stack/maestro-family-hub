CREATE TABLE public.push_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 token text NOT NULL CHECK (length(token) BETWEEN 20 AND 4096),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_devices ON public.push_devices FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));