export function formatMontant(valeur: number | null | undefined) {
  const n = Number(valeur ?? 0);
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatJourCourt(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function formatMois(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function moisCourant() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function semaineCourante() {
  const now = new Date();
  const jour = (now.getDay() + 6) % 7; // lundi = 0
  const debut = new Date(now);
  debut.setDate(now.getDate() - jour);
  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { debut: iso(debut), fin: iso(fin) };
}
