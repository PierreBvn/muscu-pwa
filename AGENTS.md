# Muscu PWA
PWA de suivi de musculation (séances, exercices, séries, reps, poids).
Usage : iPhone iOS 18, installée sur l'écran d'accueil, hors-ligne à la salle.

## Stack
Vite + React + TypeScript (strict), Tailwind CSS v4, Dexie (IndexedDB),
vite-plugin-pwa, Vitest + Testing Library, ESLint.

## Commandes
- `npm run dev` : serveur de dev
- `npm run lint` / `npm test` / `npm run build` : vérifications

## Règles
- Local-first : aucune donnée envoyée à un serveur.
- Une ligne par série (SetEntry), jamais de "3x10" stocké en texte.
- UI mobile d'abord, zones tactiles ≥ 44px.
- Pas de nouvelle dépendance sans la justifier dans le plan.
- Une tâche n'est terminée que si lint + test + build passent.
- Toujours terminer par un commit conventionnel (feat:, fix:, chore:...).
- Avant toute commande destructive (overwrite, rm, --force, reset) :
  vérifier que le travail est commité.
- Ne jamais supposer le comportement d'un flag CLI : vérifier avec --help.
- Faire un commit à la fin de chaque étape du plan (pas seulement à la fin).
- Les scripts d'outillage sont en Node (.mjs), jamais en bash ou PowerShell.
