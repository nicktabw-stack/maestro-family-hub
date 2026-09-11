import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, FileCheck2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { EtatVide } from "@/components/chargement";
import { EcranAttenteAdmin, useGardeAdmin } from "@/components/garde-admin";
import { StatutBadge, libelleCours, libellePaiement, tonPaiement } from "@/components/statut-badge";
import { formatJourCourt, formatMontant, moisCourant, semaineCourante } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: SyntheseAdmin,
});

function SyntheseAdmin() {
  const { pret } = useGardeAdmin();
  const mois = moisCourant();
  const { debut, fin } = semaineCourante();

  const { data } = useQuery({
    queryKey: ["synthese-admin", mois, debut],
    enabled: pret,
    queryFn: async () => {
      const [familles, paiements, cours, dossiers, alertes] = await Promise.all([
        supabase.from("familles").select("id, nom").eq("actif", true),
        supabase.from("paiements").select("*, familles(nom)").eq("mois", mois),
        supabase
          .from("cours")
          .select("*, enfants(prenom)")
          .gte("date_cours", debut)
          .lte("date_cours", fin)
          .order("date_cours"),
        supabase.from("maitres").select("id").eq("statut", "en_attente"),
        supabase
          .from("alertes")
          .select("*")
          .eq("lue", false)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return {
        familles: familles.data ?? [],
        paiements: paiements.data ?? [],
        cours: cours.data ?? [],
        dossiersEnAttente: dossiers.data?.length ?? 0,
        alertes: alertes.data ?? [],
      };
    },
  });

  if (!pret) return <EcranAttenteAdmin />;

  const paiements = data?.paiements ?? [];
  const aJour = paiements.filter((p) => p.statut === "a_jour").length;
  const enRetard = paiements.filter((p) => p.statut === "en_retard" || p.statut === "partiel");
  const sansPaiement = (data?.familles.length ?? 0) - paiements.length;

  return (
    <AppShell role="admin" title="Tableau de bord" subtitle="Synthèse de la structure">
      <div className="grid grid-cols-2 gap-3">
        <Carte icone={Users} valeur={aJour} libelle="Familles à jour" ton="succes" />
        <Carte
          icone={AlertTriangle}
          valeur={enRetard.length}
          libelle="Familles en retard"
          ton="danger"
        />
        <Carte
          icone={CalendarDays}
          valeur={data?.cours.length ?? 0}
          libelle="Cours cette semaine"
          ton="info"
        />
        <Link to="/admin/maitres">
          <Carte
            icone={FileCheck2}
            valeur={data?.dossiersEnAttente ?? 0}
            libelle="Dossiers à valider"
            ton="alerte"
          />
        </Link>
      </div>

      <nav className="mt-3 grid grid-cols-3 gap-2">
        <Link
          to="/admin/maitres"
          className="rounded-2xl border border-border bg-card px-3 py-3 text-center text-xs font-semibold"
        >
          Maîtres
        </Link>
        <Link
          to="/admin/familles"
          className="rounded-2xl border border-border bg-card px-3 py-3 text-center text-xs font-semibold"
        >
          Familles
        </Link>
        <Link
          to="/admin/affectations"
          className="rounded-2xl border border-border bg-card px-3 py-3 text-center text-xs font-semibold"
        >
          Affectations
        </Link>
      </nav>

      {sansPaiement > 0 ? (
        <p className="mt-3 rounded-2xl bg-warning/15 p-3 text-sm text-warning-foreground">
          {sansPaiement} famille(s) sans paiement enregistré pour le mois en cours.
        </p>
      ) : null}

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold">Alertes</h2>
        {!data?.alertes.length ? (
          <EtatVide texte="Aucune alerte en cours." />
        ) : (
          <ul className="space-y-2">
            {data.alertes.map((a) => (
              <li
                key={a.id}
                className={
                  a.severite === "danger"
                    ? "rounded-2xl border border-destructive/40 bg-destructive/10 p-3"
                    : "rounded-2xl border border-border bg-card p-3"
                }
              >
                <p className="text-sm font-semibold">{a.type}</p>
                <p className="text-sm text-muted-foreground">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold">Paiements en retard — mois en cours</h2>
        {enRetard.length === 0 ? (
          <EtatVide texte="Toutes les familles suivies sont à jour." />
        ) : (
          <ul className="space-y-2">
            {enRetard.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {(p as { familles?: { nom: string } | null }).familles?.nom ?? "Famille"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMontant(Number(p.montant_paye))} / {formatMontant(Number(p.montant_du))}
                  </p>
                </div>
                <StatutBadge ton={tonPaiement(p.statut)}>{libellePaiement(p.statut)}</StatutBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold">Cours de la semaine</h2>
        {!data?.cours.length ? (
          <EtatVide texte="Aucun cours planifié cette semaine." />
        ) : (
          <ul className="space-y-2">
            {data.cours.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {(c as { enfants?: { prenom: string } | null }).enfants?.prenom ?? "Enfant"} ·{" "}
                    {c.matiere ?? "Cours"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatJourCourt(c.date_cours)} · {c.heure_debut?.slice(0, 5)}–
                    {c.heure_fin?.slice(0, 5)}
                    {c.maitre_remplacant_id ? " · remplacement" : ""}
                  </p>
                </div>
                <StatutBadge ton={c.statut === "effectue" ? "succes" : "info"}>
                  {libelleCours(c.statut)}
                </StatutBadge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Carte({
  icone: Icone,
  valeur,
  libelle,
  ton,
}: {
  icone: React.ElementType;
  valeur: number;
  libelle: string;
  ton: "succes" | "danger" | "info" | "alerte";
}) {
  const couleurs = {
    succes: "text-success",
    danger: "text-destructive",
    info: "text-primary",
    alerte: "text-warning-foreground",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icone className={`h-5 w-5 ${couleurs[ton]}`} />
      <p className="mt-2 text-2xl font-extrabold">{valeur}</p>
      <p className="text-xs font-medium text-muted-foreground">{libelle}</p>
    </div>
  );
}
