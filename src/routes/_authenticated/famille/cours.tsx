import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MapPinOff, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Chargement, EtatVide } from "@/components/chargement";
import { StatutBadge, libelleCours } from "@/components/statut-badge";
import { formatJourCourt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/famille/cours")({
  head: () => ({
    meta: [
      { title: "Confirmer les cours — Espace famille" },
      {
        name: "description",
        content:
          "Confirmez les cours pointés par le maître : date, horaires et validation par la famille.",
      },
      { property: "og:title", content: "Confirmer les cours — Espace famille" },
      {
        property: "og:description",
        content: "Confirmez les cours pointés par le maître pour vos enfants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursFamille,
});

function heure(value: string | null | undefined, repli?: string | null) {
  if (value) return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (repli) return repli.slice(0, 5);
  return "—";
}

function CoursFamille() {
  const { user } = useSessionUser();
  const queryClient = useQueryClient();

  const { data: cours, isLoading } = useQuery({
    queryKey: ["cours-a-confirmer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cours")
        .select("*, enfants(prenom, nom)")
        .not("debut_reel", "is", null)
        .order("date_cours", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const confirmer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("confirmer_cours", { _cours_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cours confirmé");
      queryClient.invalidateQueries({ queryKey: ["cours-a-confirmer", user?.id] });
    },
    onError: () => toast.error("Confirmation impossible", { description: "Réessayez dans un instant." }),
  });

  if (isLoading) return <Chargement />;

  return (
    <AppShell role="famille" title="Cours à confirmer" subtitle="Pointages du maître">
      {!cours || cours.length === 0 ? (
        <EtatVide texte="Aucun cours pointé pour le moment." />
      ) : (
        <ul className="space-y-2">
          {cours.map((c) => {
            const enfant = (c as { enfants?: { prenom: string; nom: string | null } | null }).enfants;
            return (
              <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {enfant?.prenom ?? "Enfant"} · {c.matiere ?? "Cours"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatJourCourt(c.date_cours)} · {heure(c.debut_reel, c.heure_debut)}–
                      {heure(c.fin_reelle, c.heure_fin)}
                    </p>
                  </div>
                  <StatutBadge ton={c.statut === "effectue" ? "succes" : "info"}>
                    {libelleCours(c.statut)}
                  </StatutBadge>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {c.saisie_manuelle ? (
                    <StatutBadge ton="alerte">
                      <PenLine className="mr-1 h-3 w-3" /> Saisie manuelle
                    </StatutBadge>
                  ) : (
                    <StatutBadge ton="info">Pointage en temps réel</StatutBadge>
                  )}
                  {c.position_incoherente ? (
                    <StatutBadge ton="danger">
                      <MapPinOff className="mr-1 h-3 w-3" /> Position incohérente
                    </StatutBadge>
                  ) : null}
                </div>

                {c.confirme_famille ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4" /> Cours confirmé
                  </p>
                ) : (
                  <button
                    onClick={() => confirmer.mutate(c.id)}
                    disabled={confirmer.isPending}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmer que le cours a eu lieu
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
