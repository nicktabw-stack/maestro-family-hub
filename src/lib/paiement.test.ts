import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { montantPaiementConfirme, montantReception } from "./paiement";
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
  it("est en attente de réception lorsque la famille signale un paiement non confirmé", () => {
    strictEqual(estSignale({ statut: "en_retard", signale_famille: true }), true);
  });
  it("n'est plus en attente après la confirmation de la structure", () => {
    strictEqual(estSignale({ statut: "a_jour", signale_famille: true }), false);
  });
});