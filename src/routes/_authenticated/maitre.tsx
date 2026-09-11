import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Play, Square, PencilLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSessionUser } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Chargement, EtatVide } from "@/components/chargement";
import { StatutBadge, libelleCours, libelleMaitre, tonMaitre } from "@/components/statut-badge";
import { formatJourCourt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/maitre")({
  component: EspaceMaitre,
});

const champ =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary";

type CoursRow = {
  id: string;
  enfant_id: string;
  date_cours: string;
  heure_debut: string | null;
  heure_fin: string | null;
  matiere: string | null;
  statut: string;
  debut_reel: string | null;
  fin_reelle: string | null;
  saisie_manuelle: boolean;
  position_incoherente: boolean;
  distance_m: number | null;
  enfants?: { prenom: string; nom: string | null } | null;
};

function duree(debut: string | null, fin: string | null) {
  if (!debut || !fin) return "—";
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const min = Math.round(ms / 60000);
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

function positionActuelle(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

function EspaceMaitre() {
  const { user } = useSessionUser();
  const { data: profil } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [saisieEnfant, setSaisieEnfant] = useState<string | null>(null);
  const [saisie, setSaisie] = useState({
    date: new Date().toISOString().slice(0, 10),
    debut: "16:00",
    fin: "18:00",
    matiere: "",
  });

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

  const { data: affectations } = useQuery({
    queryKey: ["affectations-maitre", maitre?.id],
    enabled: !!maitre?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affectations")
        .select("id, enfant_id, enfants(prenom, nom, niveau)")
        .eq("maitre_id", maitre!.id)
        .eq("actif", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cours } = useQuery({
    queryKey: ["cours-maitre", maitre?.id],
    enabled: !!maitre?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cours")
        .select("*, enfants(prenom, nom)")
        .order("date_cours", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as CoursRow[];
    },
  });

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["cours-maitre", maitre?.id] });
  };

  const demarrer = useMutation({
    mutationFn: async (enfantId: string) => {
      const { lat, lng } = await positionActuelle();
      const { error } = await supabase.rpc("demarrer_cours", {
        _enfant_id: enfantId,
        ...(lat !== null && lng !== null ? { _lat: lat, _lng: lng } : {}),
      });
      if (error) throw error;
      return lat === null;
    },
    onSuccess: (sansPosition) => {
      toast.success(
        sansPosition ? "Cours démarré (position non disponible)" : "Cours démarré et position enregistrée",
      );
      rafraichir();
    },
    onError: () => toast.error("Impossible de démarrer le cours"),
  });

  const terminer = useMutation({
    mutationFn: async (coursId: string) => {
      const { error } = await supabase.rpc("terminer_cours", { _cours_id: coursId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cours terminé");
      rafraichir();
    },
    onError: () => toast.error("Impossible de terminer le cours"),
  });

  const enregistrerManuel = useMutation({
    mutationFn: async (enfantId: string) => {
      const { error } = await supabase.rpc("saisir_cours_manuel", {
        _enfant_id: enfantId,
        _date: saisie.date,
        _debut: saisie.debut,
        _fin: saisie.fin,
        _matiere: saisie.matiere.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Heures enregistrées (saisie manuelle)");
      setSaisieEnfant(null);
      rafraichir();
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  if (isLoading) return <Chargement />;

  const statut = maitre?.statut ?? "en_attente";
  const enCoursParEnfant = new Map<string, CoursRow>();
  for (const c of cours ?? []) {
    if (c.debut_reel && !c.fin_reelle) enCoursParEnfant.set(c.enfant_id, c);
  }
  const historique = (cours ?? []).filter((c) => c.fin_reelle);

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
        <h2 className="mb-2 text-sm font-bold">Mes élèves</h2>
        {!affectations || affectations.length === 0 ? (
          <EtatVide texte="Aucun enfant ne vous est affecté pour le moment." />
        ) : (
          <ul className="space-y-2">
            {affectations.map((a) => {
              const enfant = (a as { enfants?: { prenom: string; nom: string | null; niveau: string | null } | null })
                .enfants;
              const actif = enCoursParEnfant.get(a.enfant_id);
              return (
                <li key={a.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {enfant?.prenom} {enfant?.nom ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{enfant?.niveau ?? "Niveau non précisé"}</p>
                    </div>
                    {actif ? <StatutBadge ton="info">Cours en cours</StatutBadge> : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={!!actif || demarrer.isPending}
                      onClick={() => demarrer.mutate(a.enfant_id)}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" /> Démarrer
                    </button>
                    <button
                      disabled={!actif || terminer.isPending}
                      onClick={() => actif && terminer.mutate(actif.id)}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold disabled:opacity-50"
                    >
                      <Square className="h-4 w-4" /> Terminer
                    </button>
                  </div>

                  <button
                    onClick={() => setSaisieEnfant(saisieEnfant === a.enfant_id ? null : a.enfant_id)}
                    className="mt-2 flex items-center gap-2 text-xs font-semibold text-primary"
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Saisie manuelle des heures
                  </button>

                  {saisieEnfant === a.enfant_id ? (
                    <div className="mt-2 grid gap-2 rounded-xl border border-border p-3">
                      <input
                        type="date"
                        className={champ}
                        value={saisie.date}
                        onChange={(e) => setSaisie((v) => ({ ...v, date: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          className={champ}
                          value={saisie.debut}
                          onChange={(e) => setSaisie((v) => ({ ...v, debut: e.target.value }))}
                        />
                        <input
                          type="time"
                          className={champ}
                          value={saisie.fin}
                          onChange={(e) => setSaisie((v) => ({ ...v, fin: e.target.value }))}
                        />
                      </div>
                      <input
                        className={champ}
                        placeholder="Matière (optionnel)"
                        value={saisie.matiere}
                        onChange={(e) => setSaisie((v) => ({ ...v, matiere: e.target.value }))}
                      />
                      <button
                        disabled={enregistrerManuel.isPending}
                        onClick={() => enregistrerManuel.mutate(a.enfant_id)}
                        className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        Enregistrer ces heures
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold">Mes heures effectuées</h2>
        {historique.length === 0 ? (
          <EtatVide texte="Aucune heure enregistrée pour le moment." />
        ) : (
          <ul className="space-y-2">
            {historique.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {c.enfants?.prenom ?? "Enfant"} · {c.matiere ?? "Cours"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatJourCourt(c.date_cours)} · {duree(c.debut_reel, c.fin_reelle)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatutBadge ton={c.saisie_manuelle ? "alerte" : "succes"}>
                      {c.saisie_manuelle ? "Saisie manuelle" : libelleCours(c.statut)}
                    </StatutBadge>
                    {c.position_incoherente ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                        <MapPin className="h-3 w-3" /> Position incohérente
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
