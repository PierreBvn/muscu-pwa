---
name: feature
description: Workflow pour implémenter ou modifier une fonctionnalité de l'app muscu. À utiliser pour toute nouvelle fonctionnalité.
---
1. Reformuler le besoin, lister les cas limites, poser des questions si ambigu.
2. Écrire les tests Vitest d'abord et vérifier qu'ils échouent.
3. Implémenter jusqu'à ce que les tests passent.
4. Lancer `npm run lint && npm test && npm run build`, corriger jusqu'au vert.
5. Vérifier visuellement dans le navigateur en viewport iPhone (390x844).
6. Commit conventionnel + résumé de ce qui a été fait.
