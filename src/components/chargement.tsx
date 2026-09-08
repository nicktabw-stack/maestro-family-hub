export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="animate-pulse text-sm font-semibold text-muted-foreground">{texte}</p>
    </div>
  );
}

export function EtatVide({ texte }: { texte: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
      {texte}
    </div>
  );
}
