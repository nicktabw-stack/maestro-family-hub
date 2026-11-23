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
- Normalize payment assistant data with the shared payment rules and include signal flags and exact due dates so explanations match the account screens.
- Home-screen installation uses a manifest only; the dedicated Firebase messaging worker never caches the app shell, avoiding stale previews.
- Push tokens are owner-scoped in push_devices; authenticated server functions register/remove tokens and send self-tests through the Firebase connector. Remove the device on sign-out to prevent cross-account notifications.
- Browser-only Firebase imports stay dynamic; notification permission is requested only by an explicit top-level user action.
- Course completion and payment reporting use authenticated server actions; database triggers create unique events and atomic per-device delivery reservations prevent duplicate sends, including concurrent requests.
- Manual course submissions carry a request UUID persisted in manual_course_requests; repeated submissions return the same course instead of creating duplicate history or notifications.
- Admin payment alerts and navigation counts share admin-attention query data; stored payment alerts are closed by a payment-state trigger so confirmations from any screen stay consistent.
- Notification invitation dismissal is keyed to the authenticated sign-in timestamp in sessionStorage, so deferral lasts only for that login session.
