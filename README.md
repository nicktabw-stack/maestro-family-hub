# Maestro Family Hub

Créer une application web mobile-first de gestion d’une structure de maîtres à domicile. Mettre en place Lovable Cloud d’abord, puis l’authentification email/mot de passe avec réinitialisation et inscription au choix famille ou maître. Un compte maître doit déposer CNI et diplôme et rester en attente de validation/refus par l’admin ; une famille est active immédiatement. Construire la base de données sécurisée et les politiques d’accès pour Structure/admin, Maître, Famille, Enfant, Cours, Paiement et Avis mensuel conformément aux rôles et règles de confidentialité décrits par l’utilisateur. Créer le tableau de bord admin : synthèse familles à jour/en retard, cours de la semaine, alertes, liste de dossiers maîtres à valider/refuser, gestion des familles/enfants, affectations maître-enfant, historique des remplacements. Interface claire, professionnelle, en français, très lisible sur mobile. Ne pas implémenter Wave, SMS ni notifications automatisées pour le moment, mais préparer des statuts/structures adaptés.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/acce3cb9-8758-4e3c-b945-febbe34efc3c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
