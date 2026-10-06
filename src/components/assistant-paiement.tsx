import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleQuestion, Send } from "lucide-react";
import { poserQuestionPaiement } from "@/lib/assistant-paiement.functions";

const SUGGESTIONS = ["Combien dois-je payer ce mois-ci ?", "Suis-je à jour ?", "Quand est mon échéance ?"];

export function AssistantPaiement() {
  const poser = useServerFn(poserQuestionPaiement);
  const [question, setQuestion] = useState("");
  const mutation = useMutation({
    mutationFn: (q: string) => poser({ data: { question: q } }),
  });

  const envoyer = (q: string) => {
    const texte = q.trim();
    if (texte.length < 3 || mutation.isPending) return;
    setQuestion(texte);
    mutation.mutate(texte);
  };

  const resultat = mutation.data;
  const erreur = mutation.isError
    ? "L'assistant n'a pas pu répondre. Réessayez."
    : resultat && !resultat.ok
      ? resultat.message
      : null;

  return (
    <section className="mt-3 rounded-2xl border border-border bg-card p-3">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <MessageCircleQuestion className="h-4 w-4 text-primary" />
        Une question sur vos paiements ?
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        L'assistant répond à partir des informations de votre compte.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={mutation.isPending}
            onClick={() => envoyer(s)}
            className="rounded-full border border-border px-2.5 py-1 text-xs font-medium disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          envoyer(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="Ex : pourquoi mon paiement est en attente ?"
          aria-label="Votre question"
          className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <button
          type="submit"
          disabled={mutation.isPending || question.trim().length < 3}
          aria-label="Envoyer la question"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {mutation.isPending && (
        <p role="status" className="mt-2 animate-pulse text-xs font-semibold text-muted-foreground">
          L'assistant réfléchit…
        </p>
      )}
      {!mutation.isPending && resultat?.ok && (
        <p role="status" className="mt-2 whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm">
          {resultat.reponse}
        </p>
      )}
      {!mutation.isPending && erreur && (
        <p role="alert" className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {erreur}
        </p>
      )}
    </section>
  );
}
