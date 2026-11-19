<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Payment screens refresh active queries every three seconds so changes from another account appear without navigation.
- Keep payment amount rules in `src/lib/paiement.ts` and browser confirmation writes in `paiement-actions.ts` so both admin views preserve historical amounts and reject zero-value confirmations consistently.
