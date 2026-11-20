import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { donneesPaiementAssistant } from "@/lib/paiement";

export const poserQuestionPaiement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ question: z.string().trim().min(3).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    const { repondreQuestion, AssistantError } = await import("./assistant-paiement.server");
    const { data: famille, error } = await context.supabase
      .from("familles")
      .select("id, nom, montant_mensuel, jour_echeance")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) return { ok: false as const, message: "Impossible de lire votre compte." };
    if (!famille) return { ok: false as const, message: "Aucune fiche famille reliée à votre compte." };

    const { data: paiements, error: erreurPaiements } = await context.supabase
      .from("paiements")
      .select("mois, statut, montant_du, montant_paye, signale_famille, signale_at, date_paiement")
      .eq("famille_id", famille.id)
      .order("mois", { ascending: false })
      .limit(12);
    if (erreurPaiements) return { ok: false as const, message: "Impossible de lire vos paiements. Réessayez." };

    try {
      const reponse = await repondreQuestion(data.question, {
        famille: {
          nom: famille.nom,
          montant_mensuel_fcfa: famille.montant_mensuel,
          jour_echeance: famille.jour_echeance,
          echeance_exacte: famille.jour_echeance ? `À régler le ${famille.jour_echeance} du mois (date exacte, et non avant ce jour).` : null,
        },
        paiements: (paiements ?? []).map((p) => donneesPaiementAssistant(p, Number(famille.montant_mensuel))),
      });
      return { ok: true as const, reponse };
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof AssistantError ? e.message : "L'assistant n'a pas pu répondre.",
      };
    }
  });
