ALTER TABLE public.familles ADD COLUMN IF NOT EXISTS montant_mensuel numeric NOT NULL DEFAULT 0;
ALTER TABLE public.familles ADD COLUMN IF NOT EXISTS jour_echeance smallint CHECK (jour_echeance BETWEEN 1 AND 31);

CREATE OR REPLACE FUNCTION public.signaler_paiement()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _famille RECORD; _id uuid; _mois date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  SELECT id, nom, montant_mensuel INTO _famille FROM public.familles WHERE user_id = auth.uid() LIMIT 1;
  IF _famille.id IS NULL THEN RAISE EXCEPTION 'non autorise'; END IF;
  SELECT id INTO _id FROM public.paiements
  WHERE famille_id = _famille.id AND statut IN ('en_retard','partiel')
  ORDER BY mois DESC LIMIT 1;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM public.paiements WHERE famille_id = _famille.id AND mois = _mois LIMIT 1;
    IF _id IS NULL THEN
      INSERT INTO public.paiements (famille_id, mois, methode, statut, montant_du)
      VALUES (_famille.id, _mois, 'wave', 'en_retard', coalesce(_famille.montant_mensuel,0)) RETURNING id INTO _id;
    END IF;
  END IF;
  UPDATE public.paiements SET signale_famille = true, signale_at = now(), methode = 'wave',
    montant_du = CASE WHEN montant_du = 0 THEN coalesce(_famille.montant_mensuel,0) ELSE montant_du END
  WHERE id = _id;
  INSERT INTO public.alertes (type, message, severite, famille_id)
  VALUES ('Paiement signalé', 'La famille ' || coalesce(_famille.nom,'') || ' indique avoir payé via Wave. À vérifier.', 'info', _famille.id);
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public.signaler_paiement() FROM public;
GRANT EXECUTE ON FUNCTION public.signaler_paiement() TO authenticated;