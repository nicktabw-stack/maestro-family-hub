import { supabase } from "@/integrations/supabase/client";
import { montantReception } from "@/lib/paiement";

export async function confirmerReceptionPaiement(id: string) {
  const { data: paiement, error: erreurLecture } = await supabase
    .from("paiements")
    .select("statut, montant_du, montant_paye, familles(montant_mensuel)")
    .eq("id", id)
    .single();
  if (erreurLecture) throw erreurLecture;
  if (!paiement) throw new Error("Paiement introuvable.");
  if (paiement.statut === "a_jour") return;
  if (paiement.statut === "annule") throw new Error("Ce paiement est annulé.");
  const montant = montantReception(paiement, Number(paiement.familles?.montant_mensuel ?? 0));
  if (montant <= 0) throw new Error("Définissez le montant mensuel avant de confirmer la réception.");
  const { error } = await supabase
    .from("paiements")
    .update({
      statut: "a_jour",
      montant_du: montant,
      montant_paye: montant,
      date_paiement: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .in("statut", ["en_retard", "partiel"])
    .select("id")
    .single();
  if (error) throw error;
}