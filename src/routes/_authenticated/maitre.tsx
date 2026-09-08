import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSessionUser } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Chargement, EtatVide } from "@/components/chargement";
import { StatutBadge, libelleCours, libelleMaitre, tonMaitre } from "@/components/statut-badge";
import { formatJourCourt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/maitre")({
  component: EspaceMaitre,
});

function EspaceMaitre() {
  const { user } = useSessionUser();
  const { data: profil } = useProfile(user?.id);

  const { data: maitre, isLoading } = useQuery({
    queryKey: ["maitre", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maitres")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cours } = useQuery({
    queryKey: ["cours-maitre", maitre?.id],
    enabled: !!maitre?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cours")
        .select("*, enfants(prenom, nom)")
        .order("date_cours", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Chargement />;

  const statut = maitre?.statut ?? "en_attente";

  return (
    <AppShell role="maitre" title="Espace maître" subtitle={profil?.full_name ?? undefined}>
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Statut du dossier</h2>
          <StatutBadge ton={tonMaitre(statut)}>{libelleMaitre(statut)}</StatutBadge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {statut === "valide"
            ? "Votre dossier est validé. Vous pouvez recevoir des affectations."
            : statut === "refuse"
              ? `Dossier refusé. Motif : ${maitre?.motif_refus ?? "non précisé"}.`
              : statut === "suspendu"
                ? "Votre compte est suspendu. Contactez l'administration."
                : "Votre dossier est en cours d'examen par l'administration."}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Matières</dt>
            <dd className="font-semibold">{maitre?.specialites ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Zone</dt>
            <dd className="font-semibold">{maitre?.zone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pièce d'identité</dt>
            <dd className="font-semibold">{maitre?.cni_path ? "Déposée" : "Manquante"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Diplôme</dt>
            <dd className="font-semibold">{maitre?.diplome_path ? "Déposé" : "Manquant"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold">Mes prochains cours</h2>
        {!cours || cours.length === 0 ? (
          <EtatVide texte="Aucun cours planifié pour le moment." />
        ) : (
          <ul className="space-y-2">
            {cours.map((c) => (
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
