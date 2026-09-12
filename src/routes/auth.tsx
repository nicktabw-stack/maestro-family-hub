import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "connexion" | "inscription" | "oubli";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search["mode"] === "inscription" ? "inscription" : "connexion") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Connexion et inscription — MaîtreDom" },
      {
        name: "description",
        content:
          "Connectez-vous ou créez votre compte famille ou maître pour accéder à votre espace MaîtreDom.",
      },
      { property: "og:title", content: "Connexion et inscription — MaîtreDom" },
      {
        property: "og:description",
        content: "Espace famille et espace maître de la structure de maîtres à domicile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageAuth,
});

const champ =
  "h-12 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus:border-primary";
const label = "text-sm font-semibold";

function ChampFichier({
  id,
  libelle,
  obligatoire = false,
  fichier,
  onFichier,
}: {
  id: string;
  libelle: string;
  obligatoire?: boolean;
  fichier: File | null;
  onFichier: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{libelle}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            obligatoire ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground",
          )}
        >
          {obligatoire ? "Obligatoire" : "Optionnel"}
        </span>
      </div>
      <input
        id={id}
        type="file"
        accept="image/*,application/pdf"
        required={obligatoire && !fichier}
        className="sr-only"
        onChange={(e) => onFichier(e.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className="flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-primary"
      >
        <Upload className="h-4 w-4 shrink-0" aria-hidden />
        <span>{fichier ? "Changer le fichier" : "Choisir un fichier"}</span>
      </label>
      {fichier ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{fichier.name}</span>
        </p>
      ) : null}
    </div>
  );
}

function PageAuth() {
  const { mode: modeInitial } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(modeInitial);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-10">
        <Link to="/" className="text-sm font-semibold text-primary">
          ← Accueil
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          {mode === "connexion"
            ? "Connexion"
            : mode === "inscription"
              ? "Créer un compte"
              : "Mot de passe oublié"}
        </h1>

        <div className="mt-5">
          {mode === "connexion" ? <FormConnexion onMode={setMode} /> : null}
          {mode === "inscription" ? <FormInscription onMode={setMode} /> : null}
          {mode === "oubli" ? <FormOubli onMode={setMode} /> : null}
        </div>
      </div>
    </div>
  );
}

function FormConnexion({ onMode }: { onMode: (m: Mode) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      });
      if (error) {
        const message =
          error.message.toLowerCase().includes("email not confirmed")
            ? "Votre adresse e-mail n'est pas encore confirmée."
            : "E-mail ou mot de passe incorrect.";
        setErreur(message);
        toast.error("Connexion impossible", { description: message });
        return;
      }
      navigate({ to: "/espace", replace: true });
    } catch {
      const message = "Connexion impossible pour le moment. Vérifiez votre connexion internet.";
      setErreur(message);
      toast.error(message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <div className="space-y-1.5">
        <label className={label} htmlFor="email">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          required
          className={champ}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor="mdp">
          Mot de passe
        </label>
        <input
          id="mdp"
          type="password"
          required
          className={champ}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
      </div>
      {erreur ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {erreur}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={enCours}
        className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" className="font-semibold text-primary" onClick={() => onMode("oubli")}>
          Mot de passe oublié ?
        </button>
        <button
          type="button"
          className="font-semibold text-primary"
          onClick={() => onMode("inscription")}
        >
          Créer un compte
        </button>
      </div>
    </form>
  );
}

function FormOubli({ onMode }: { onMode: (m: Mode) => void }) {
  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setEnCours(false);
    if (error) {
      toast.error("Envoi impossible", { description: error.message });
      return;
    }
    toast.success("E-mail envoyé", {
      description: "Consultez votre boîte mail pour choisir un nouveau mot de passe.",
    });
    onMode("connexion");
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>
      <div className="space-y-1.5">
        <label className={label} htmlFor="email-oubli">
          Adresse e-mail
        </label>
        <input
          id="email-oubli"
          type="email"
          required
          className={champ}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={enCours}
        className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {enCours ? "Envoi…" : "Envoyer le lien"}
      </button>
      <button
        type="button"
        className="w-full text-sm font-semibold text-primary"
        onClick={() => onMode("connexion")}
      >
        Retour à la connexion
      </button>
    </form>
  );
}

function FormInscription({ onMode }: { onMode: (m: Mode) => void }) {
  const navigate = useNavigate();
  const [type, setType] = useState<"famille" | "maitre">("famille");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [specialites, setSpecialites] = useState("");
  const [niveauEtudes, setNiveauEtudes] = useState("");
  const [cni, setCni] = useState<File | null>(null);
  const [diplome, setDiplome] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (nom.trim().length < 2) {
      toast.error("Veuillez indiquer un nom complet.");
      return;
    }
    if (motDePasse.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (type === "maitre" && (!cni || !diplome)) {
      toast.error("Documents requis", {
        description: "La pièce d'identité et le diplôme sont obligatoires.",
      });
      return;
    }
    const dejaUtilise =
      "Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez-en une autre.";
    setEnCours(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: motDePasse,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        const m = error.message.toLowerCase();
        if (
          m.includes("already registered") ||
          m.includes("already been registered") ||
          m.includes("already exists") ||
          error.status === 422
        ) {
          setErreur(dejaUtilise);
          toast.error("Inscription impossible", { description: dejaUtilise });
          return;
        }
        throw error;
      }
      const user = data.user;
      if (!user || (user.identities && user.identities.length === 0)) {
        setErreur(dejaUtilise);
        toast.error("Inscription impossible", { description: dejaUtilise });
        return;
      }
      if (!data.session) {
        const m = "Compte créé. Confirmez votre e-mail puis connectez-vous.";
        setErreur(m);
        toast.success(m);
        return;
      }



      await supabase.from("profiles").insert({
        id: user.id,
        full_name: nom.trim(),
        email: email.trim(),
        telephone: telephone.trim() || null,
      });
      await supabase.from("user_roles").insert({ user_id: user.id, role: type });

      if (type === "famille") {
        await supabase.from("familles").insert({
          user_id: user.id,
          nom: nom.trim(),
          telephone: telephone.trim() || null,
          adresse: adresse.trim() || null,
          quartier: quartier.trim() || null,
        });
        toast.success("Compte famille créé", { description: "Votre espace est actif." });
      } else {
        async function envoyer(fichier: File, prefixe: string) {
          const chemin = `${user!.id}/${prefixe}-${Date.now()}-${fichier.name.replace(/\s+/g, "_")}`;
          const { error: erreurUpload } = await supabase.storage
            .from("documents-maitres")
            .upload(chemin, fichier, {
              contentType: fichier.type || "application/octet-stream",
              upsert: false,
            });
          if (erreurUpload) throw erreurUpload;
          return chemin;
        }
        const cheminCni = await envoyer(cni!, "cni");
        const cheminDiplome = await envoyer(diplome!, "diplome");
        const cheminCv = cv ? await envoyer(cv, "cv") : null;
        await supabase.from("maitres").insert({
          user_id: user.id,
          statut: "en_attente",
          cni_path: cheminCni,
          diplome_path: cheminDiplome,
          cv_path: cheminCv,
          specialites: specialites.trim() || null,
          niveau_etudes: niveauEtudes.trim() || null,
          zone: quartier.trim() || null,
        });
        toast.success("Dossier déposé", {
          description: "Votre compte sera activé après validation par l'administration.",
        });
      }
      navigate({ to: "/espace", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Réessayez plus tard.";
      toast.error("Inscription impossible", { description: message });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(["famille", "maitre"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold transition-colors",
              type === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            {t === "famille" ? "Je suis une famille" : "Je suis un maître"}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="nom">
          {type === "famille" ? "Nom de la famille" : "Nom complet"}
        </label>
        <input
          id="nom"
          required
          maxLength={100}
          className={champ}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor="tel">
          Téléphone
        </label>
        <input
          id="tel"
          type="tel"
          maxLength={30}
          className={champ}
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor="email-inscription">
          Adresse e-mail
        </label>
        <input
          id="email-inscription"
          type="email"
          required
          className={champ}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor="mdp-inscription">
          Mot de passe (8 caractères minimum)
        </label>
        <input
          id="mdp-inscription"
          type="password"
          required
          className={champ}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor="quartier">
          Quartier {type === "maitre" ? "d'intervention" : ""}
        </label>
        <input
          id="quartier"
          className={champ}
          value={quartier}
          onChange={(e) => setQuartier(e.target.value)}
        />
      </div>

      {type === "famille" ? (
        <div className="space-y-1.5">
          <label className={label} htmlFor="adresse">
            Adresse
          </label>
          <input
            id="adresse"
            className={champ}
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className={label} htmlFor="specialites">
              Matières enseignées
            </label>
            <input
              id="specialites"
              className={champ}
              placeholder="Maths, Français…"
              value={specialites}
              onChange={(e) => setSpecialites(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="niveau">
              Niveau d'études
            </label>
            <input
              id="niveau"
              className={champ}
              placeholder="Licence, Master…"
              value={niveauEtudes}
              onChange={(e) => setNiveauEtudes(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-dashed border-border bg-card p-4">
            <p className="text-sm font-semibold">Vos documents</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Ils restent confidentiels : seuls vous et l'administration y avez accès.
            </p>
            <div className="space-y-3">
              <ChampFichier
                id="cni"
                libelle="Pièce d'identité (CNI)"
                obligatoire
                fichier={cni}
                onFichier={setCni}
              />
              <ChampFichier
                id="diplome"
                libelle="Diplôme"
                obligatoire
                fichier={diplome}
                onFichier={setDiplome}
              />
              <ChampFichier id="cv" libelle="CV" fichier={cv} onFichier={setCv} />
            </div>
          </div>
          <p className="rounded-xl bg-warning/15 p-3 text-sm text-warning-foreground">
            Votre compte restera en attente jusqu'à la validation de votre dossier par
            l'administration.
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {enCours ? "Création…" : "Créer mon compte"}
      </button>
      <button
        type="button"
        className="w-full text-sm font-semibold text-primary"
        onClick={() => onMode("connexion")}
      >
        J'ai déjà un compte
      </button>
    </form>
  );
}
