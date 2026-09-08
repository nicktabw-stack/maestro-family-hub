import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — MaîtreDom" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte." },
      { property: "og:title", content: "Nouveau mot de passe — MaîtreDom" },
      { property: "og:description", content: "Réinitialisation du mot de passe de votre compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PageReset,
});

function PageReset() {
  const navigate = useNavigate();
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (mdp.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (mdp !== confirmation) {
      toast.error("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnCours(false);
    if (error) {
      toast.error("Modification impossible", { description: error.message });
      return;
    }
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/espace", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pt-12">
        <h1 className="text-2xl font-extrabold tracking-tight">Nouveau mot de passe</h1>
        <form onSubmit={soumettre} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" htmlFor="n1">
              Nouveau mot de passe
            </label>
            <input
              id="n1"
              type="password"
              required
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus:border-primary"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" htmlFor="n2">
              Confirmer le mot de passe
            </label>
            <input
              id="n2"
              type="password"
              required
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus:border-primary"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={enCours}
            className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
