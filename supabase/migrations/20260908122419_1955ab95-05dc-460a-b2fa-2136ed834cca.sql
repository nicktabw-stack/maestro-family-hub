
CREATE TYPE public.app_role AS ENUM ('admin','maitre','famille');
CREATE TYPE public.maitre_statut AS ENUM ('en_attente','valide','refuse','suspendu');
CREATE TYPE public.cours_statut AS ENUM ('planifie','effectue','annule','remplace');
CREATE TYPE public.paiement_statut AS ENUM ('a_jour','partiel','en_retard','annule');
CREATE TYPE public.paiement_methode AS ENUM ('especes','virement','wave','autre');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  telephone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles_select_self" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_insert_self_non_admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');

-- MAITRES
CREATE TABLE public.maitres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  statut public.maitre_statut NOT NULL DEFAULT 'en_attente',
  cni_path TEXT,
  diplome_path TEXT,
  specialites TEXT,
  niveau_etudes TEXT,
  zone TEXT,
  bio TEXT,
  motif_refus TEXT,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.maitres TO authenticated;
GRANT ALL ON public.maitres TO service_role;
ALTER TABLE public.maitres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maitres_select" ON public.maitres FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "maitres_insert_self" ON public.maitres FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND statut = 'en_attente');
CREATE POLICY "maitres_update_self_docs" ON public.maitres FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "maitres_admin_all" ON public.maitres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_maitres_updated BEFORE UPDATE ON public.maitres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FAMILLES
CREATE TABLE public.familles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users ON DELETE SET NULL,
  nom TEXT NOT NULL DEFAULT '',
  telephone TEXT,
  adresse TEXT,
  quartier TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  notes_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.familles TO authenticated;
GRANT ALL ON public.familles TO service_role;
ALTER TABLE public.familles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "familles_select" ON public.familles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "familles_insert_self" ON public.familles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "familles_update_self" ON public.familles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "familles_admin_all" ON public.familles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_familles_updated BEFORE UPDATE ON public.familles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_famille_owner(_famille_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.familles f WHERE f.id = _famille_id AND f.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_maitre_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id FROM public.maitres m WHERE m.user_id = auth.uid();
$$;

-- ENFANTS
CREATE TABLE public.enfants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_id UUID NOT NULL REFERENCES public.familles(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT,
  niveau TEXT,
  date_naissance DATE,
  remarques TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enfants TO authenticated;
GRANT ALL ON public.enfants TO service_role;
ALTER TABLE public.enfants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_enfants_updated BEFORE UPDATE ON public.enfants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AFFECTATIONS
CREATE TABLE public.affectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maitre_id UUID NOT NULL REFERENCES public.maitres(id) ON DELETE CASCADE,
  enfant_id UUID NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  remplace_affectation_id UUID REFERENCES public.affectations(id) ON DELETE SET NULL,
  motif_remplacement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affectations TO authenticated;
GRANT ALL ON public.affectations TO service_role;
ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_affectations_updated BEFORE UPDATE ON public.affectations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.maitre_suit_enfant(_enfant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affectations a
    JOIN public.maitres m ON m.id = a.maitre_id
    WHERE a.enfant_id = _enfant_id AND a.actif AND m.user_id = auth.uid()
  );
$$;

CREATE POLICY "enfants_select" ON public.enfants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_famille_owner(famille_id) OR public.maitre_suit_enfant(id));
CREATE POLICY "enfants_admin_all" ON public.enfants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "enfants_famille_manage" ON public.enfants FOR INSERT TO authenticated
  WITH CHECK (public.is_famille_owner(famille_id));
CREATE POLICY "enfants_famille_update" ON public.enfants FOR UPDATE TO authenticated
  USING (public.is_famille_owner(famille_id)) WITH CHECK (public.is_famille_owner(famille_id));

CREATE POLICY "affectations_select" ON public.affectations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR maitre_id = public.current_maitre_id()
    OR EXISTS (SELECT 1 FROM public.enfants e WHERE e.id = enfant_id AND public.is_famille_owner(e.famille_id))
  );
CREATE POLICY "affectations_admin_all" ON public.affectations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COURS
CREATE TABLE public.cours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  maitre_id UUID NOT NULL REFERENCES public.maitres(id) ON DELETE CASCADE,
  maitre_remplacant_id UUID REFERENCES public.maitres(id) ON DELETE SET NULL,
  date_cours DATE NOT NULL,
  heure_debut TIME NOT NULL DEFAULT '16:00',
  heure_fin TIME NOT NULL DEFAULT '18:00',
  matiere TEXT,
  statut public.cours_statut NOT NULL DEFAULT 'planifie',
  compte_rendu TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cours TO authenticated;
GRANT ALL ON public.cours TO service_role;
ALTER TABLE public.cours ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cours_updated BEFORE UPDATE ON public.cours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "cours_select" ON public.cours FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR maitre_id = public.current_maitre_id()
    OR maitre_remplacant_id = public.current_maitre_id()
    OR EXISTS (SELECT 1 FROM public.enfants e WHERE e.id = enfant_id AND public.is_famille_owner(e.famille_id))
  );
CREATE POLICY "cours_admin_all" ON public.cours FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "cours_maitre_update" ON public.cours FOR UPDATE TO authenticated
  USING (maitre_id = public.current_maitre_id() OR maitre_remplacant_id = public.current_maitre_id())
  WITH CHECK (maitre_id = public.current_maitre_id() OR maitre_remplacant_id = public.current_maitre_id());

-- PAIEMENTS
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_id UUID NOT NULL REFERENCES public.familles(id) ON DELETE CASCADE,
  mois DATE NOT NULL,
  montant_du NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut public.paiement_statut NOT NULL DEFAULT 'en_retard',
  methode public.paiement_methode NOT NULL DEFAULT 'especes',
  reference_transaction TEXT,
  date_paiement DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (famille_id, mois)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paiements TO authenticated;
GRANT ALL ON public.paiements TO service_role;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_paiements_updated BEFORE UPDATE ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "paiements_select" ON public.paiements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_famille_owner(famille_id));
CREATE POLICY "paiements_admin_all" ON public.paiements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- AVIS MENSUELS
CREATE TABLE public.avis_mensuels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  maitre_id UUID NOT NULL REFERENCES public.maitres(id) ON DELETE CASCADE,
  mois DATE NOT NULL,
  note SMALLINT,
  points_forts TEXT,
  points_a_travailler TEXT,
  commentaire TEXT,
  visible_famille BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enfant_id, maitre_id, mois)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avis_mensuels TO authenticated;
GRANT ALL ON public.avis_mensuels TO service_role;
ALTER TABLE public.avis_mensuels ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_avis_updated BEFORE UPDATE ON public.avis_mensuels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "avis_select" ON public.avis_mensuels FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR maitre_id = public.current_maitre_id()
    OR (visible_famille AND EXISTS (SELECT 1 FROM public.enfants e WHERE e.id = enfant_id AND public.is_famille_owner(e.famille_id)))
  );
CREATE POLICY "avis_admin_all" ON public.avis_mensuels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "avis_maitre_insert" ON public.avis_mensuels FOR INSERT TO authenticated
  WITH CHECK (maitre_id = public.current_maitre_id() AND public.maitre_suit_enfant(enfant_id));
CREATE POLICY "avis_maitre_update" ON public.avis_mensuels FOR UPDATE TO authenticated
  USING (maitre_id = public.current_maitre_id()) WITH CHECK (maitre_id = public.current_maitre_id());

-- ALERTES
CREATE TABLE public.alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severite TEXT NOT NULL DEFAULT 'info',
  lue BOOLEAN NOT NULL DEFAULT false,
  famille_id UUID REFERENCES public.familles(id) ON DELETE CASCADE,
  maitre_id UUID REFERENCES public.maitres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertes TO authenticated;
GRANT ALL ON public.alertes TO service_role;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertes_admin_all" ON public.alertes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_cours_date ON public.cours(date_cours);
CREATE INDEX idx_enfants_famille ON public.enfants(famille_id);
CREATE INDEX idx_affectations_enfant ON public.affectations(enfant_id);
CREATE INDEX idx_paiements_mois ON public.paiements(mois);
