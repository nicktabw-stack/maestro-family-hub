import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ShieldCheck, Users, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaîtreDom — Gestion des maîtres à domicile" },
      {
        name: "description",
        content:
          "Plateforme de gestion d'une structure de maîtres à domicile : dossiers des maîtres, familles, enfants, cours, paiements et avis mensuels.",
      },
      { property: "og:title", content: "MaîtreDom — Gestion des maîtres à domicile" },
      {
        property: "og:description",
        content:
          "Suivi des familles, validation des dossiers de maîtres, planning des cours et paiements mensuels, sur mobile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accueil,
});

const POINTS = [
  { icon: ShieldCheck, titre: "Dossiers vérifiés", texte: "CNI et diplôme déposés, validés par l'administration." },
  { icon: Users, titre: "Familles et enfants", texte: "Fiches complètes et affectations claires." },
  { icon: CalendarCheck, titre: "Cours de la semaine", texte: "Planning, remplacements et comptes rendus." },
  { icon: Wallet, titre: "Paiements mensuels", texte: "Familles à jour ou en retard, en un coup d'œil." },
];

function Accueil() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 pb-16 pt-14">
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Structure de maîtres à domicile
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
          Gérez vos maîtres, vos familles et vos cours depuis votre téléphone.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Inscription des familles, dépôt et validation des dossiers de maîtres, suivi des cours,
          des paiements et des avis mensuels.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/auth"
            search={{ mode: "inscription" }}
            className="flex h-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
          >
            Créer un compte
          </Link>
          <Link
            to="/auth"
            search={{ mode: "connexion" }}
            className="flex h-12 items-center justify-center rounded-xl border border-border bg-card text-base font-semibold"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-10 grid gap-3">
          {POINTS.map((p) => (
            <div key={p.titre} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold">{p.titre}</h2>
                <p className="text-sm text-muted-foreground">{p.texte}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
