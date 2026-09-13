import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, MapPinOff, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { EtatVide } from "@/components/chargement";
import { EcranAttenteAdmin, useGardeAdmin } from "@/components/garde-admin";
import { StatutBadge, libelleCours } from "@/components/statut-badge";
import { formatJourCourt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cours")({
  component: HistoriqueCours,
});

function heure(value: string | null | undefined, repli?: string | null) {
  if (value) return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (repli) return repli.slice(0, 5);
  return "—";
}

function duree(debut: string | null, fin: string | null) {
  if (!debut || !fin) return null;
  const minutes = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000);
  if (minutes <= 0) return null;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

function HistoriqueCours() {
  const { pret } = useGardeAdmin();
  const [enfantId, setEnfantId] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-historique-cours"],
    enabled: pret,
    queryFn: async () => {
      const [enfants, cours] = await Promise.all([
        supabase.from("enfants").select("id, prenom, nom, familles(nom)").order("prenom"),
        supabase
          .from("cours")
          .select("*, enfants(prenom, nom)")
          .order("date_cours", { ascending: false })
          .limit(300),
      ]);
      return { enfants: enfants.data ?? [], cours: cours.data ?? [] };
    },
  });

  if (!pret) return <EcranAttenteAdmin />;

  const enfants = data?.enfants ?? [];
  const cours = (data?.cours ?? []).filter((c) => !enfantId || c.enfant_id === enfantId);

  return (
    <AppShell role="admin" title="Historique des cours" subtitle="Suivi des pointages par enfant">
      <label className="block text-xs font-bold text-muted-foreground" htmlFor="filtre-enfant">
        Filtrer par enfant
      </label>
      <select
        id="filtre-enfant"
        value={enfantId}
        onChange={(e) => setEnfantId(e.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
      >
        <option value="">Tous les enfants</option>
        {enfants.map((e) => (
          <option key={e.id} value={e.id}>
            {e.prenom} {e.nom ?? ""} —{" "}
            {(e as { familles?: { nom: string } | null }).familles?.nom ?? "Famille"}
          </option>
        ))}
      </select>

      <section className="mt-4">
        {cours.length === 0 ? (
          <EtatVide texte="Aucun cours enregistré." />
        ) : (
          <ul className="space-y-2">
            {cours.map((c) => {
              const enfant = (c as { enfants?: { prenom: string; nom: string | null } | null }).enfants;
              const d = duree(c.debut_reel, c.fin_reelle);
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
                        {d ? ` · ${d}` : ""}
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
                      <StatutBadge ton="info">
                        <Clock className="mr-1 h-3 w-3" /> Temps réel
                      </StatutBadge>
                    )}
                    {c.confirme_famille ? (
                      <StatutBadge ton="succes">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmé par le parent
                      </StatutBadge>
                    ) : (
                      <StatutBadge ton="neutre">En attente de confirmation</StatutBadge>
                    )}
                    {c.position_incoherente ? (
                      <StatutBadge ton="danger">
                        <MapPinOff className="mr-1 h-3 w-3" /> Position incohérente
                        {c.distance_m ? ` (${Math.round(Number(c.distance_m))} m)` : ""}
                      </StatutBadge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
