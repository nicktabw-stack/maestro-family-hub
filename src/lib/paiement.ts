// Lien de paiement Wave fixe de la structure.
// Aucune API : la famille ouvre ce lien, paie, puis informe la structure,
// qui confirme manuellement via « Marquer comme payé » dans l'admin.
export const LIEN_PAIEMENT_WAVE = "https://pay.wave.com/m/M_ci_vd5eYWll6jXx/c/ci/";

export const ACTUALISATION_PAIEMENTS_MS = 3000;

type MontantsPaiement = {
  montant_paye: number | string | null;
  montant_du: number | string | null;
};

// Conserver les montants historiques positifs ; réparer uniquement les anciens zéros.
export function montantPaiementConfirme(paiement: MontantsPaiement, mensualite: number) {
  return Number(paiement.montant_paye) > 0
    ? Number(paiement.montant_paye)
    : montantReception(paiement, mensualite);
}

export function montantReception(paiement: MontantsPaiement, mensualite: number) {
  return Number(paiement.montant_du) > 0 ? Number(paiement.montant_du) : mensualite;
}

export function donneesPaiementAssistant<T extends MontantsPaiement & {
  statut: string;
  signale_famille?: boolean | null;
}>(paiement: T, mensualite: number) {
  return {
    ...paiement,
    statut: paiement.statut === "a_jour" || paiement.statut === "annule"
      ? paiement.statut
      : paiement.signale_famille ? "signale" : paiement.statut,
    montant_paye: paiement.statut === "a_jour"
      ? montantPaiementConfirme(paiement, mensualite)
      : paiement.montant_paye,
  };
}
