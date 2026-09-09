import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { EtatVide } from "@/components/chargement";
import { EcranAttenteAdmin, useGardeAdmin } from "@/components/garde-admin";
import { StatutBadge } from "@/components/statut-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/affectations")({
  component: AdminAffectations,
});

const champ =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary";

type Onglet = "actives" | "historique";

function AdminAffectations() {
  const { pret } = useGardeAdmin();
  const queryClient = useQueryClient();
  const [onglet, setOnglet] = useState<Onglet>("actives");
  const [form, setForm] = useState({ enfant_id: "", maitre_id: "", motif: "" });
  const [motifs, setMotifs] = useState<Record<string, string>>({});

  const { data: enfants } = useQuery({
    queryKey: ["affect-enfants"],
    enabled: pret,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enfants")
        .select("id, prenom, nom, familles(nom)")
        .eq("actif", true)
        .order("prenom");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: maitres } = useQuery({
    queryKey: ["affect-maitres"],
    enabled: pret,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maitres")
        .select("id, user_id, specialites, zone")
        .eq("statut", "valide");
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const profils = ids.length
        ? ((await supabase.from("profiles").select("id, full_name").in("id", ids)).data ?? [])
        : [];
      return (data ?? []).map((m) => ({
        ...m,
        nom: profils.find((p) => p.id === m.user_id)?.full_name || "Maître",
      }));
    },
  });

  const { data: affectations } = useQuery({
    queryKey: ["affectations"],
    enabled: pret,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affectations")
        .select("*, enfants(prenom, nom, familles(nom))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const creer = useMutation({
    mutationFn: async () => {
      const precedente = (affectations ?? []).find(
        (a) => a.enfant_id === form.enfant_id && a.actif,
      );
      if (precedente) {
        const { error } = await supabase
          .from("affectations")
          .update({
            actif: false,
            date_fin: new Date().toISOString().slice(0, 10),
            motif_remplacement: form.motif.trim() || null,
          })
          .eq("id", precedente.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("affectations").insert({
        enfant_id: form.enfant_id,
        maitre_id: form.maitre_id,
        remplace_affectation_id: precedente?.id ?? null,
        motif_remplacement: precedente ? form.motif.trim() || null : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Affectation enregistrée");
      setForm({ enfant_id: "", maitre_id: "", motif: "" });
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
    },
    onError: () => toast.error("Affectation impossible"),
  });

  const cloturer = useMutation({
    mutationFn: async ({ id, motif }: { id: string; motif?: string | undefined }) => {
      const { error } = await supabase
        .from("affectations")
        .update({
          actif: false,
          date_fin: new Date().toISOString().slice(0, 10),
          motif_remplacement: motif?.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Affectation clôturée");
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
    },
    onError: () => toast.error("Action impossible"),
  });

  if (!pret) return <EcranAttenteAdmin />;

  const nomMaitre = (id: string) => maitres?.find((m) => m.id === id)?.nom ?? "Maître";
  const liste = (affectations ?? []).filter((a) => (onglet === "actives" ? a.actif : !a.actif));

  return (
    <AppShell role="admin" title="Affectations" subtitle="Maîtres et enfants suivis">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Nouvelle affectation</h2>
        <div className="mt-3 grid gap-2">
          <select
            className={champ}
            value={form.enfant_id}
            onChange={(e) => setForm((v) => ({ ...v, enfant_id: e.target.value }))}
          >
            <option value="">Choisir un enfant…</option>
            {(enfants ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.prenom} {e.nom ?? ""} —{" "}
                {(e as { familles?: { nom: string } | null }).familles?.nom ?? "Famille"}
              </option>
            ))}
          </select>
          <select
            className={champ}
            value={form.maitre_id}
            onChange={(e) => setForm((v) => ({ ...v, maitre_id: e.target.value }))}
          >
            <option value="">Choisir un maître validé…</option>
            {(maitres ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
                {m.specialites ? ` — ${m.specialites}` : ""}
              </option>
            ))}
          </select>
          <input
            className={champ}
            placeholder="Motif si remplacement (facultatif)"
            value={form.motif}
            onChange={(e) => setForm((v) => ({ ...v, motif: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Si l'enfant a déjà un maître, l'affectation en cours est clôturée automatiquement et
            conservée dans l'historique des remplacements.
          </p>
          <button
            disabled={!form.enfant_id || !form.maitre_id || creer.isPending}
            onClick={() => creer.mutate()}
            className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Affecter
          </button>
        </div>
      </section>

      <div className="mt-5 flex gap-2">
        {(["actives", "historique"] as const).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold",
              onglet === o ? "bg-primary text-primary-foreground" : "border border-border",
            )}
          >
            {o === "actives" ? "En cours" : "Historique"}
          </button>
        ))}
      </div>

      <section className="mt-3 space-y-2">
        {liste.length === 0 ? (
          <EtatVide
            texte={
              onglet === "actives" ? "Aucune affectation en cours." : "Aucun remplacement passé."
            }
          />
        ) : (
          liste.map((a) => {
            const enfant = (
              a as { enfants?: { prenom: string; nom: string | null; familles?: { nom: string } | null } | null }
            ).enfants;
            return (
              <article key={a.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {enfant?.prenom} {enfant?.nom ?? ""} · {nomMaitre(a.maitre_id)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {enfant?.familles?.nom ?? "Famille"} · depuis {formatDate(a.date_debut)}
                      {a.date_fin ? ` → ${formatDate(a.date_fin)}` : ""}
                    </p>
                    {a.motif_remplacement ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Motif : {a.motif_remplacement}
                      </p>
                    ) : null}
                  </div>
                  <StatutBadge ton={a.actif ? "succes" : "neutre"}>
                    {a.actif ? "En cours" : "Terminée"}
                  </StatutBadge>
                </div>

                {a.actif ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      className={champ}
                      placeholder="Motif de fin"
                      value={motifs[a.id] ?? ""}
                      onChange={(e) => setMotifs((m) => ({ ...m, [a.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => cloturer.mutate({ id: a.id, motif: motifs[a.id] })}
                      className="h-11 shrink-0 rounded-xl border border-destructive px-3 text-sm font-semibold text-destructive"
                    >
                      Clôturer
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
