import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSessionUser } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Chargement, EtatVide } from "@/components/chargement";
import {
  StatutBadge,
  libelleCours,
  libellePaiement,
  tonPaiement,
} from "@/components/statut-badge";
import { formatJourCourt, formatMois, formatMontant } from "@/lib/format";
import { geolocationErrorMessage, getCurrentPosition } from "@/lib/geolocation";

export const Route = createFileRoute("/_authenticated/famille")({
  component: EspaceFamille,
});

function EspaceFamille() {
  const { user } = useSessionUser();
  const { data: profil } = useProfile(user?.id);

  const { data: famille, isLoading } = useQuery({
    queryKey: ["famille", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("familles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: enfants } = useQuery({
    queryKey: ["enfants-famille", famille?.id],
    enabled: !!famille?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enfants")
        .select("*")
        .eq("famille_id", famille!.id)
        .order("prenom");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: paiements } = useQuery({
    queryKey: ["paiements-famille", famille?.id],
    enabled: !!famille?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("famille_id", famille!.id)
        .order("mois", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cours } = useQuery({
    queryKey: ["cours-famille", famille?.id],
    enabled: !!famille?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cours")
        .select("*, enfants(prenom)")
        .order("date_cours", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: avis } = useQuery({
    queryKey: ["avis-famille", famille?.id],
    enabled: !!famille?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avis_mensuels")
        .select("*, enfants(prenom)")
        .order("mois", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const queryClient = useQueryClient();

  const enregistrerPosition = useMutation({
    mutationFn: async () => {
      if (!famille?.id) throw new Error("no famille");
      const position = await getCurrentPosition();
      const { data, error } = await supabase
        .from("familles")
        .update({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        .eq("id", famille.id)
        .select("id, latitude, longitude")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("non-enregistre");
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["famille", user?.id], (ancienne: typeof famille) =>
        ancienne ? { ...ancienne, latitude: data.latitude, longitude: data.longitude } : ancienne,
      );
      toast.success("Position enregistrée", {
        description: `${data.latitude?.toFixed(5)}, ${data.longitude?.toFixed(5)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["famille", user?.id] });
    },
    onError: (err) => {
      const description =
        err instanceof Error && err.message === "non-enregistre"
          ? "Votre fiche famille n'est pas encore reliée à votre compte. Contactez l'administration."
          : geolocationErrorMessage(err);
      toast.error("Position non enregistrée", {
        description,
        duration: 7000,
      });
    },
  });

  if (isLoading) return <Chargement />;

  const latitude = famille?.latitude ?? null;
  const longitude = famille?.longitude ?? null;

  return (
    <AppShell role="famille" title="Espace famille" subtitle={profil?.full_name ?? undefined}>
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{famille?.nom ?? "Ma famille"}</h2>
        <p className="text-sm text-muted-foreground">
          {[famille?.quartier, famille?.adresse].filter(Boolean).join(" · ") || "Adresse à compléter"}
        </p>

        <div className="mt-3 rounded-xl bg-muted/50 p-3">
          <p className="text-xs font-bold">Position du domicile</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latitude != null && longitude != null
              ? `Enregistrée : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : "Aucune position enregistrée. Elle sert à vérifier les pointages du maître."}
          </p>
          <button
            disabled={!famille?.id || enregistrerPosition.isPending}
            onClick={() => enregistrerPosition.mutate()}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary text-sm font-semibold text-primary disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            {enregistrerPosition.isPending
              ? "Localisation en cours…"
              : latitude != null
                ? "Mettre à jour ma position"
                : "Enregistrer ma position"}
          </button>
        </div>
      </section>

      <Bloc titre="Mes enfants">
        {!enfants || enfants.length === 0 ? (
          <EtatVide texte="Aucun enfant enregistré. L'administration peut les ajouter pour vous." />
        ) : (
          <ul className="space-y-2">
            {enfants.map((e) => (
              <li key={e.id} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-sm font-semibold">
                  {e.prenom} {e.nom ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">{e.niveau ?? "Niveau non précisé"}</p>
              </li>
            ))}
          </ul>
        )}
      </Bloc>

      <Bloc titre="Paiements">
        {!paiements || paiements.length === 0 ? (
          <EtatVide texte="Aucun paiement enregistré." />
        ) : (
          <ul className="space-y-2">
            {paiements.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-semibold capitalize">{formatMois(p.mois)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMontant(Number(p.montant_paye))} / {formatMontant(Number(p.montant_du))}
                  </p>
                </div>
                <StatutBadge ton={tonPaiement(p.statut)}>{libellePaiement(p.statut)}</StatutBadge>
              </li>
            ))}
          </ul>
        )}
      </Bloc>

      <Bloc titre="Prochains cours">
        {!cours || cours.length === 0 ? (
          <EtatVide texte="Aucun cours planifié." />
        ) : (
          <ul className="space-y-2">
            {cours.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {(c as { enfants?: { prenom: string } | null }).enfants?.prenom} ·{" "}
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
      </Bloc>

      <Bloc titre="Avis mensuels">
        {!avis || avis.length === 0 ? (
          <EtatVide texte="Aucun avis publié pour le moment." />
        ) : (
          <ul className="space-y-2">
            {avis.map((a) => (
              <li key={a.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {(a as { enfants?: { prenom: string } | null }).enfants?.prenom}
                  </p>
                  <span className="text-xs capitalize text-muted-foreground">
                    {formatMois(a.mois)}
                  </span>
                </div>
                {a.note != null ? (
                  <p className="mt-1 text-xs font-semibold text-primary">Note : {a.note}/20</p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">{a.commentaire ?? "—"}</p>
              </li>
            ))}
          </ul>
        )}
      </Bloc>
    </AppShell>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-bold">{titre}</h2>
      {children}
    </section>
  );
}
