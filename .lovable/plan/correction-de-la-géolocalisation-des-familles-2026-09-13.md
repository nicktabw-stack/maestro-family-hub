# Correction de la géolocalisation des familles

## Objectif
Rendre les boutons de position fiables dans l’espace famille et l’administration, sans état bloqué.

## Modifications
- Centraliser la demande de géolocalisation avec un délai maximal garanti, même si le navigateur ne répond pas correctement.
- Différencier clairement : permission refusée, délai dépassé, localisation indisponible et navigateur non compatible.
- Dans l’espace famille, capturer puis enregistrer immédiatement les coordonnées, actualiser la fiche et confirmer avec les coordonnées sauvegardées.
- Dans l’administration, afficher l’état « Localisation en cours… », remplir les coordonnées capturées, puis permettre leur enregistrement avec validation du résultat retourné par la base.
- Empêcher les doubles clics pendant une capture ou une sauvegarde et proposer automatiquement de réessayer après un échec.

## Vérification
- Vérifier les erreurs de compilation.
- Tester les états succès, refus et délai dépassé dans un navigateur mobile simulé lorsque l’accès à un compte de test le permet.
