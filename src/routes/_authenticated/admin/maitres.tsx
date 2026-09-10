import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { EtatVide } from "@/components/chargement";
import { EcranAttenteAdmin, useGardeAdmin } from "@/components/garde-admin";
import { StatutBadge, libelleMaitre, tonMaitre } from "@/components/statut-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/maitres")({
  component: AdminMaitres,
});

const FILTRES = [
  { cle: "en_attente", libelle: "À valider" },
  { cle: "valide", libelle: "Validés" },
  { cle: "refuse", libelle: "Refusés" },
] as const;

function AdminMaitres() {
  const { pret } = useGardeAdmin();
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["cle"]>("en_attente");
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [apercu, setApercu] = useState<{
    titre: string;
    url: string | null;
    estImage: boolean;
  } | null>(null);

  const { data: maitres } = useQuery({
    queryKey: ["admin-maitres", filtre],
    enabled: pret,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maitres")
        .select("*")
        .eq("statut", filtre)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const profils = ids.length
        ? (await supabase.from("profiles").select("id, full_name, email, telephone").in("id", ids))
            .data ?? []
        : [];
      return (data ?? []).map((m) => ({
        ...m,
        profil: profils.find((p) => p.id === m.user_id) ?? null,
      }));
    },
  });

  const decision = useMutation({
    mutationFn: async ({
      id,
      statut,
      motif,
    }: {
      id: string;
      statut: "valide" | "refuse";
      motif?: string;
    }) => {
      const { error } = await supabase
        .from("maitres")
        .update({
          statut,
          motif_refus: statut === "refuse" ? (motif ?? null) : null,
          validated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.statut === "valide" ? "Maître validé" : "Dossier refusé");
      queryClient.invalidateQueries({ queryKey: ["admin-maitres"] });
      queryClient.invalidateQueries({ queryKey: ["synthese-admin"] });
    },
    onError: () => toast.error("Action impossible"),
  });

  async function ouvrirDocument(chemin: string | null, titre: string) {
    if (!chemin) {
      toast.error("Document absent");
      return;
    }
    setApercu({ titre, url: null, estImage: false });
    const { data, error } = await supabase.storage
      .from("documents-maitres")
      .createSignedUrl(chemin, 300);
    if (error || !data) {
      setApercu(null);
      toast.error("Document inaccessible");
      return;
    }
    try {
      const reponse = await fetch(data.signedUrl);
      const blob = await reponse.blob();
      const extension = chemin.split(".").pop()?.toLowerCase() ?? "";
      const estImage = ["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(extension);
      const type = estImage
        ? `image/${extension === "jpg" ? "jpeg" : extension}`
        : extension === "pdf"
          ? "application/pdf"
          : blob.type || "application/octet-stream";
      const url = URL.createObjectURL(new Blob([blob], { type }));
      setApercu({ titre, url, estImage });
    } catch {
      setApercu(null);
      toast.error("Aperçu impossible");
    }
  }

  function fermerApercu() {
    if (apercu?.url) URL.revokeObjectURL(apercu.url);
    setApercu(null);
  }

  if (!pret) return <EcranAttenteAdmin />;

  return (
    <AppShell role="admin" title="Maîtres" subtitle="Dossiers et validation">
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary p-1">
        {FILTRES.map((f) => (
          <button
            key={f.cle}
            onClick={() => setFiltre(f.cle)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold",
              filtre === f.cle ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {!maitres?.length ? (
          <EtatVide texte="Aucun dossier dans cette catégorie." />
        ) : (
          maitres.map((m) => (
            <article key={m.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold">
                    {m.profil?.full_name || "Nom non renseigné"}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.profil?.email} · {m.profil?.telephone ?? "sans téléphone"}
                  </p>
                </div>
                <StatutBadge ton={tonMaitre(m.statut)}>{libelleMaitre(m.statut)}</StatutBadge>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Matières</dt>
                  <dd className="font-semibold">{m.specialites ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Niveau</dt>
                  <dd className="font-semibold">{m.niveau_etudes ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Zone</dt>
                  <dd className="font-semibold">{m.zone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Déposé le</dt>
                  <dd className="font-semibold">{formatDate(m.created_at)}</dd>
                </div>
              </dl>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => ouvrirDocument(m.cni_path, "Pièce d'identité (CNI)")}
                  className="h-10 rounded-xl border border-border text-sm font-semibold"
                >
                  Voir la CNI
                </button>
                <button
                  onClick={() => ouvrirDocument(m.diplome_path, "Diplôme")}
                  className="h-10 rounded-xl border border-border text-sm font-semibold"
                >
                  Voir le diplôme
                </button>
                <button
                  disabled={!m.cv_path}
                  onClick={() => ouvrirDocument(m.cv_path, "CV")}
                  className="col-span-2 h-10 rounded-xl border border-border text-sm font-semibold disabled:opacity-50"
                >
                  {m.cv_path ? "Voir le CV" : "CV non fourni"}
                </button>
              </div>

              {m.statut === "refuse" && m.motif_refus ? (
                <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  Motif : {m.motif_refus}
                </p>
              ) : null}

              {m.statut === "en_attente" ? (
                <div className="mt-3 space-y-2">
                  <input
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                    placeholder="Motif en cas de refus"
                    maxLength={300}
                    value={motifs[m.id] ?? ""}
                    onChange={(e) => setMotifs((s) => ({ ...s, [m.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => decision.mutate({ id: m.id, statut: "valide" })}
                      className="h-11 flex-1 rounded-xl bg-success text-sm font-semibold text-success-foreground"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => {
                        const motif = (motifs[m.id] ?? "").trim();
                        if (!motif) {
                          toast.error("Indiquez le motif du refus.");
                          return;
                        }
                        decision.mutate({ id: m.id, statut: "refuse", motif });
                      }}
                      className="h-11 flex-1 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}
