import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return response;
  };
}

export class AssistantError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const INSTRUCTIONS = `Tu es l'assistant paiements d'une structure de maîtres à domicile en Côte d'Ivoire.
Réponds en français, simplement, en 2 à 6 phrases maximum, à une famille.
Base-toi UNIQUEMENT sur les données JSON du compte fournies. N'invente jamais un montant, une date ou un statut.
Si une information manque, dis-le et invite à contacter la structure.
Explique : montant mensuel (FCFA), jour d'échéance, état de chaque paiement récent.
Statuts : "a_jour" = payé ; "en_retard" = en retard ; "en_attente" = non réglé ; "signale" = paiement signalé, en attente de confirmation par la structure ; "annule" = annulé.
Le paiement se fait via le bouton « Payer via Wave », puis « J'ai effectué le paiement » ; seule la structure confirme la réception.
Ne réponds pas aux questions sans rapport avec les paiements du compte.`;

export async function repondreQuestion(question: string, donnees: unknown) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AssistantError("Assistant non configuré.", 500);

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createRunIdFetch(),
  });

  let erreur: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: `Données du compte (date du jour ${new Date().toISOString().slice(0, 10)}) :\n${JSON.stringify(donnees)}\n\nQuestion : ${question}`,
      },
    ],
    onError: ({ error }) => {
      erreur = error;
    },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  let texte = "";
  try {
    texte = await result.text;
  } catch (e) {
    erreur ??= e;
  }
  if (erreur || !texte.trim()) {
    const status = Number((erreur as { statusCode?: number })?.statusCode ?? 0);
    console.error("assistant-paiement", erreur);
    if (status === 429) throw new AssistantError("Trop de demandes. Réessayez dans un moment.", 429);
    if (status === 402 || status === 403)
      throw new AssistantError("L'assistant est momentanément indisponible (crédits IA).", status);
    throw new AssistantError("L'assistant n'a pas pu répondre. Réessayez plus tard.", 500);
  }
  return texte.trim();
}
