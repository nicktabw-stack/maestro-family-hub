import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  neutre: "bg-muted text-muted-foreground",
  succes: "bg-success/15 text-success",
  alerte: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-primary/10 text-primary",
};

export function StatutBadge({
  ton = "neutre",
  children,
  className,
}: {
  ton?: keyof typeof STYLES;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        STYLES[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function tonMaitre(statut: string) {
  if (statut === "valide") return "succes" as const;
  if (statut === "refuse") return "danger" as const;
  if (statut === "suspendu") return "alerte" as const;
  return "alerte" as const;
}

export function libelleMaitre(statut: string) {
  return (
    { en_attente: "En attente", valide: "Validé", refuse: "Refusé", suspendu: "Suspendu" }[
      statut
    ] ?? statut
  );
}

export function tonPaiement(statut: string) {
  if (statut === "a_jour") return "succes" as const;
  if (statut === "partiel") return "alerte" as const;
  if (statut === "annule") return "neutre" as const;
  return "danger" as const;
}

export function libellePaiement(statut: string) {
  return (
    { a_jour: "À jour", partiel: "Partiel", en_retard: "En retard", annule: "Annulé" }[statut] ??
    statut
  );
}

export function estSignale(p: { statut: string; signale_famille?: boolean | null }) {
  return !!p.signale_famille && p.statut !== "a_jour" && p.statut !== "annule";
}

export function libellePaiementComplet(p: { statut: string; signale_famille?: boolean | null }) {
  if (p.statut === "a_jour") return "Payé";
  if (estSignale(p)) return "Paiement signalé - en attente de confirmation";
  return libellePaiement(p.statut);
}

export function tonPaiementComplet(p: { statut: string; signale_famille?: boolean | null }) {
  return estSignale(p) ? ("info" as const) : tonPaiement(p.statut);
}

export function libelleCours(statut: string) {
  return (
    { planifie: "Planifié", effectue: "Effectué", annule: "Annulé", remplace: "Remplacé" }[
      statut
    ] ?? statut
  );
}
