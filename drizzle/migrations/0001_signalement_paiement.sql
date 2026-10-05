ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS signale_famille boolean NOT NULL DEFAULT false;
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS signale_at timestamptz;

CREATE OR REPLACE FUNCTION public.signaler_paiement()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _famille RECORD; _id uuid; _mois date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  SELECT id, nom INTO _famille FROM public.familles WHERE user_id = auth.uid() LIMIT 1;
  IF _famille.id IS NULL THEN RAISE EXCEPTION 'non autorise'; END IF;

  SELECT id INTO _id FROM public.paiements
  WHERE famille_id = _famille.id AND statut IN ('en_retard','partiel')
  ORDER BY mois DESC LIMIT 1;

  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.paiements WHERE famille_id = _famille.id AND mois = _mois LIMIT 1;
    IF _id IS NOT NULL THEN
      -- mois courant déjà à jour/annulé : rien à signaler de plus, on crée quand même la trace
      NULL;
    ELSE
      INSERT INTO public.paiements (famille_id, mois, methode, statut)
      VALUES (_famille.id, _mois, 'wave', 'en_retard') RETURNING id INTO _id;
    END IF;
  END IF;

  UPDATE public.paiements SET signale_famille = true, signale_at = now(), methode = 'wave'
  WHERE id = _id;

  INSERT INTO public.alertes (type, message, severite, famille_id)
  VALUES ('Paiement signalé', 'La famille ' || coalesce(_famille.nom,'') || ' indique avoir payé via Wave. À vérifier.', 'info', _famille.id);

  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.signaler_paiement() FROM public;
GRANT EXECUTE ON FUNCTION public.signaler_paiement() TO authenticated;