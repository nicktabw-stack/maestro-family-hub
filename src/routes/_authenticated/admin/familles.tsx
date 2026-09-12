import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { EtatVide } from "@/components/chargement";
import { EcranAttenteAdmin, useGardeAdmin } from "@/components/garde-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/familles")({
  component: AdminFamilles,
});

const champ =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary";

function AdminFamilles() {
  const { pret } = useGardeAdmin();
  const queryClient = useQueryClient();
  const [recherche, setRecherche] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nouvelleFamille, setNouvelleFamille] = useState({
    nom: "",
    telephone: "",
    quartier: "",
    adresse: "",
  });

  const { data: familles } = useQuery({
    queryKey: ["admin-familles"],
    enabled: pret,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("familles")
        .select("*, enfants(id, prenom, nom, niveau, actif)")
        .order("nom");
      if (error) throw error;
      return data ?? [];
    },
  });

  const creerFamille = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("familles").insert({
        nom: nouvelleFamille.nom.trim(),
        telephone: nouvelleFamille.telephone.trim() || null,
        quartier: nouvelleFamille.quartier.trim() || null,
        adresse: nouvelleFamille.adresse.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Famille ajoutée");
      setNouvelleFamille({ nom: "", telephone: "", quartier: "", adresse: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-familles"] });
    },
    onError: () => toast.error("Ajout impossible"),
  });

  const basculerActif = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase.from("familles").update({ actif }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-familles"] }),
    onError: () => toast.error("Modification impossible"),
  });

  const enregistrerGps = useMutation({
    mutationFn: async (v: { id: string; latitude: number | null; longitude: number | null }) => {
      const { error } = await supabase
        .from("familles")
        .update({ latitude: v.latitude, longitude: v.longitude })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Position du domicile enregistrée");
      queryClient.invalidateQueries({ queryKey: ["admin-familles"] });
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  const ajouterEnfant = useMutation({
    mutationFn: async (v: {
      famille_id: string;
      prenom: string;
      nom: string;
      niveau: string;
    }) => {
      const { error } = await supabase.from("enfants").insert({
        famille_id: v.famille_id,
        prenom: v.prenom.trim(),
        nom: v.nom.trim() || null,
        niveau: v.niveau.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enfant ajouté");
      queryClient.invalidateQueries({ queryKey: ["admin-familles"] });
    },
    onError: () => toast.error("Ajout impossible"),
  });

  if (!pret) return <EcranAttenteAdmin />;

  const liste = (familles ?? []).filter((f) =>
    `${f.nom} ${f.quartier ?? ""}`.toLowerCase().includes(recherche.toLowerCase()),
  );

  return (
    <AppShell role="admin" title="Familles" subtitle="Familles et enfants suivis">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Nouvelle famille</h2>
        <div className="mt-3 grid gap-2">
          <input
            className={champ}
            placeholder="Nom de la famille"
            value={nouvelleFamille.nom}
            onChange={(e) => setNouvelleFamille((v) => ({ ...v, nom: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={champ}
              placeholder="Téléphone"
              value={nouvelleFamille.telephone}
              onChange={(e) => setNouvelleFamille((v) => ({ ...v, telephone: e.target.value }))}
            />
            <input
              className={champ}
              placeholder="Quartier"
              value={nouvelleFamille.quartier}
              onChange={(e) => setNouvelleFamille((v) => ({ ...v, quartier: e.target.value }))}
            />
          </div>
          <input
            className={champ}
            placeholder="Adresse"
            value={nouvelleFamille.adresse}
            onChange={(e) => setNouvelleFamille((v) => ({ ...v, adresse: e.target.value }))}
          />
          <button
            disabled={!nouvelleFamille.nom.trim() || creerFamille.isPending}
            onClick={() => creerFamille.mutate()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Ajouter la famille
          </button>
        </div>
      </section>

      <input
        className={cn(champ, "mt-5")}
        placeholder="Rechercher une famille…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      <section className="mt-3 space-y-2">
        {liste.length === 0 ? (
          <EtatVide texte="Aucune famille enregistrée." />
        ) : (
          liste.map((f) => {
            const enfants =
              (f as { enfants?: { id: string; prenom: string; nom: string | null; niveau: string | null }[] })
                .enfants ?? [];
            const ouvert = ouverte === f.id;
            return (
              <article key={f.id} className="rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setOuverte(ouvert ? null : f.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{f.nom || "Sans nom"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[f.quartier, f.telephone].filter(Boolean).join(" · ") || "Coordonnées à compléter"}
                      {" · "}
                      {enfants.length} enfant(s)
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      ouvert && "rotate-180",
                    )}
                  />
                </button>

                {ouvert ? (
                  <div className="border-t border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {f.actif ? "Famille active" : "Famille inactive"}
                      </span>
                      <button
                        onClick={() => basculerActif.mutate({ id: f.id, actif: !f.actif })}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold"
                      >
                        {f.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    </div>

                    {enfants.length === 0 ? (
                      <EtatVide texte="Aucun enfant enregistré." />
                    ) : (
                      <ul className="space-y-2">
                        {enfants.map((e) => (
                          <li key={e.id} className="rounded-xl border border-border p-3">
                            <p className="text-sm font-semibold">
                              {e.prenom} {e.nom ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.niveau ?? "Niveau non précisé"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <PositionEnregistree
                      latitude={(f as { latitude: number | null }).latitude}
                      longitude={(f as { longitude: number | null }).longitude}
                    />

                    <FormulaireGps
                      latitude={(f as { latitude: number | null }).latitude}
                      longitude={(f as { longitude: number | null }).longitude}
                      enCours={enregistrerGps.isPending}
                      onEnregistrer={(latitude, longitude) =>
                        enregistrerGps.mutate({ id: f.id, latitude, longitude })
                      }
                    />

                    <FormulaireEnfant
                      enCours={ajouterEnfant.isPending}
                      onAjouter={(v) => ajouterEnfant.mutate({ famille_id: f.id, ...v })}
                    />
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

function FormulaireEnfant({
  onAjouter,
  enCours,
}: {
  onAjouter: (v: { prenom: string; nom: string; niveau: string }) => void;
  enCours: boolean;
}) {
  const [v, setV] = useState({ prenom: "", nom: "", niveau: "" });
  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-muted/50 p-3">
      <p className="text-xs font-bold">Ajouter un enfant</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={champ}
          placeholder="Prénom"
          value={v.prenom}
          onChange={(e) => setV((s) => ({ ...s, prenom: e.target.value }))}
        />
        <input
          className={champ}
          placeholder="Nom"
          value={v.nom}
          onChange={(e) => setV((s) => ({ ...s, nom: e.target.value }))}
        />
      </div>
      <input
        className={champ}
        placeholder="Niveau (ex. CM2)"
        value={v.niveau}
        onChange={(e) => setV((s) => ({ ...s, niveau: e.target.value }))}
      />
      <button
        disabled={!v.prenom.trim() || enCours}
        onClick={() => {
          onAjouter(v);
          setV({ prenom: "", nom: "", niveau: "" });
        }}
        className="h-10 rounded-xl border border-primary text-sm font-semibold text-primary disabled:opacity-60"
      >
        Ajouter l'enfant
      </button>
    </div>
  );
}

function FormulaireGps({
  latitude,
  longitude,
  onEnregistrer,
  enCours,
}: {
  latitude: number | null;
  longitude: number | null;
  onEnregistrer: (latitude: number | null, longitude: number | null) => void;
  enCours: boolean;
}) {
  const [lat, setLat] = useState(latitude != null ? String(latitude) : "");
  const [lng, setLng] = useState(longitude != null ? String(longitude) : "");

  function utiliserPositionActuelle() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Localisation indisponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
      },
      () => toast.error("Autorisation de localisation refusée"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-muted/50 p-3">
      <p className="text-xs font-bold">Position du domicile (contrôle des pointages)</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={champ}
          placeholder="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className={champ}
          placeholder="Longitude"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={utiliserPositionActuelle}
          className="h-10 rounded-xl border border-border text-sm font-semibold"
        >
          Ma position
        </button>
        <button
          disabled={enCours}
          onClick={() =>
            onEnregistrer(
              lat.trim() ? Number(lat) : null,
              lng.trim() ? Number(lng) : null,
            )
          }
          className="h-10 rounded-xl border border-primary text-sm font-semibold text-primary disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
