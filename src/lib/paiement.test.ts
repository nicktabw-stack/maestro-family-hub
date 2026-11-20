import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { montantPaiementConfirme, montantReception, donneesPaiementAssistant } from "./paiement";
import { estSignale } from "../components/statut-badge";

describe("montants confirmés", () => {
  it("affiche 15 000 FCFA pour un ancien paiement confirmé à zéro", () => {
    strictEqual(montantPaiementConfirme({ montant_paye: 0, montant_du: 15000 }, 15000), 15000);
  });
  it("utilise la mensualité de 15 000 FCFA si les anciens montants sont nuls", () => {
    strictEqual(montantPaiementConfirme({ montant_paye: 0, montant_du: 0 }, 15000), 15000);
  });
  it("ne remplace pas un montant historique positif par un nouveau tarif", () => {
    strictEqual(montantPaiementConfirme({ montant_paye: 12000, montant_du: 12000 }, 15000), 12000);
  });
  it("enregistre la mensualité à la confirmation si le montant dû est nul", () => {
    strictEqual(montantReception({ montant_paye: 0, montant_du: 0 }, 15000), 15000);
  });
});

describe("signalement", () => {
  it("transmet à l'assistant le signalement en attente plutôt qu'un simple retard", () => {
    strictEqual(donneesPaiementAssistant({ statut: "en_retard", signale_famille: true, montant_paye: 0, montant_du: 15000 }, 15000).statut, "signale");
  });
  it("transmet à l'assistant le montant confirmé de 15 000 FCFA sans écrire en base", () => {
    const p = { statut: "a_jour", signale_famille: true, montant_paye: 0, montant_du: 15000 };
    const resultat = donneesPaiementAssistant(p, 15000);
    strictEqual(resultat.montant_paye, 15000);
    strictEqual(resultat.statut, "a_jour");
    strictEqual(p.montant_paye, 0);
  });
  it("est en attente de réception lorsque la famille signale un paiement non confirmé", () => {
    strictEqual(estSignale({ statut: "en_retard", signale_famille: true }), true);
  });
  it("n'est plus en attente après la confirmation de la structure", () => {
    strictEqual(estSignale({ statut: "a_jour", signale_famille: true }), false);
  });
});