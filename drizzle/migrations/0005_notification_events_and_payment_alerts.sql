CREATE TABLE public.push_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('cours_termine','paiement_signale')),
 resource_id uuid NOT NULL,
 actor_id uuid,
 recipient_ids uuid[] NOT NULL DEFAULT '{}',
 body text NOT NULL,
 path text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,resource_id)
);
GRANT ALL ON public.push_events TO service_role;
ALTER TABLE public.push_events ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.push_events(id) ON DELETE CASCADE,
 device_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','sent','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id,device_id)
);
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes ADD COLUMN paiement_id uuid REFERENCES public.paiements(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.queue_course_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _prenom text; _recipient uuid;
BEGIN
 IF NEW.fin_reelle IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.fin_reelle IS NOT NULL THEN RETURN NEW; END IF; END IF;
 SELECT e.prenom,f.user_id INTO _prenom,_recipient FROM public.enfants e JOIN public.familles f ON f.id=e.famille_id WHERE e.id=NEW.enfant_id;
 INSERT INTO public.push_events(kind,resource_id,actor_id,recipient_ids,body,path)
 VALUES('cours_termine',NEW.id,auth.uid(),CASE WHEN _recipient IS NULL THEN '{}'::uuid[] ELSE ARRAY[_recipient] END,
 'Le cours de '||coalesce(_prenom,'votre enfant')||' est terminé, merci de confirmer','/famille/cours') ON CONFLICT(kind,resource_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_course_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER queue_course_push AFTER INSERT OR UPDATE ON public.cours FOR EACH ROW EXECUTE FUNCTION public.queue_course_push();
CREATE OR REPLACE FUNCTION public.sync_payment_push_alerts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _nom text; _montant numeric; _recipients uuid[];
BEGIN
 IF NEW.signale_famille AND NEW.statut IN ('en_retard','partiel') THEN
  IF TG_OP='UPDATE' THEN IF OLD.signale_famille AND OLD.statut IN ('en_retard','partiel') THEN RETURN NEW; END IF; END IF;
  SELECT nom,CASE WHEN NEW.montant_du>0 THEN NEW.montant_du ELSE montant_mensuel END INTO _nom,_montant FROM public.familles WHERE id=NEW.famille_id;
  SELECT coalesce(array_agg(user_id),'{}'::uuid[]) INTO _recipients FROM public.user_roles WHERE role='admin';
  INSERT INTO public.push_events(kind,resource_id,actor_id,recipient_ids,body,path)
  VALUES('paiement_signale',NEW.id,auth.uid(),_recipients,'La famille '||coalesce(_nom,'')||' indique avoir payé '||trim(to_char(coalesce(_montant,0),'FM999999999999990'))||' FCFA via Wave. À vérifier.','/admin/familles?famille='||NEW.famille_id::text)
  ON CONFLICT(kind,resource_id) DO NOTHING;
 ELSE
  UPDATE public.alertes SET lue=true WHERE type='Paiement signalé' AND (paiement_id=NEW.id OR (paiement_id IS NULL AND famille_id=NEW.famille_id AND NOT EXISTS(SELECT 1 FROM public.paiements p WHERE p.famille_id=NEW.famille_id AND p.signale_famille AND p.statut IN ('en_retard','partiel'))));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_payment_push_alerts() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_payment_push_alerts AFTER INSERT OR UPDATE ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.sync_payment_push_alerts();
CREATE OR REPLACE FUNCTION public.link_payment_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.type='Paiement signalé' THEN
  IF NEW.paiement_id IS NULL THEN
   SELECT p.id INTO NEW.paiement_id FROM public.paiements p WHERE p.famille_id=NEW.famille_id AND p.signale_famille AND p.statut IN ('en_retard','partiel') ORDER BY p.signale_at DESC LIMIT 1;
  END IF;
  NEW.lue := NOT EXISTS(SELECT 1 FROM public.paiements p WHERE p.id=NEW.paiement_id AND p.signale_famille AND p.statut IN ('en_retard','partiel'));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.link_payment_alert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER link_payment_alert BEFORE INSERT ON public.alertes FOR EACH ROW EXECUTE FUNCTION public.link_payment_alert();
CREATE OR REPLACE FUNCTION public.terminer_cours(_cours_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.cours WHERE id=_cours_id AND maitre_id=public.current_maitre_id() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'non autorise'; END IF;
 UPDATE public.cours SET fin_reelle=now(),heure_fin=localtime,statut='effectue' WHERE id=_cours_id AND fin_reelle IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.terminer_cours(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.terminer_cours(uuid) TO authenticated;
