# Muscu PWA
PWA de suivi de musculation (séances, exercices, séries, reps, poids).
Usage : iPhone iOS 18, installée sur l'écran d'accueil, hors-ligne à la salle.

## Stack
Vite + React + TypeScript (strict), Tailwind CSS v4, Dexie (IndexedDB),
vite-plugin-pwa, Vitest + Testing Library, ESLint.

## Commandes
- `npm run dev` : serveur de dev
- `npm run lint` / `npm test` / `npm run build` : vérifications

## Interface mobile
- La meta viewport contient `viewport-fit=cover` ; tout élément fixé en bas utilise `env(safe-area-inset-bottom)`.
- Tests d'interface : requêtes par rôle ou libellé (getByRole, getByLabelText). Pas de test sur les classes CSS.
- Une tâche d'interface ne modifie pas `src/db/`. Un besoin manquant est signalé dans le plan, pas implémenté.

## Architecture
- Les composants n'importent jamais `db` directement : toute lecture/écriture passe par les fonctions de `src/db/`.
- Dans la section « Ambiguïtés » d'un plan : poser la question et proposer une option, sans écrire « l'UI fera X ». La décision revient à l'utilisateur.

## Conventions de tests
- Les tests sont dans un dossier `__tests__/` à côté du code testé (ex. `src/__tests__/` pour `src/App.tsx`).

## Design
- docs/specs/design.md fait foi. Couleurs uniquement via les tokens @theme : aucune couleur codée en dur, jamais de violet/indigo ni de dégradé.
- Une tâche de style ne modifie ni la logique, ni src/db/, ni les tests.

## Vocabulaire
- Interface : « séance type » (jamais « programme »). Code : Program / programs. Ne pas renommer le code pour suivre l'interface.

## État et dates
- L'état d'une séance vit dans Dexie (useLiveQuery), jamais uniquement en mémoire React : l'app doit survivre à une fermeture par iOS.
- Les tests qui dépendent de la date ou de l'heure la fixent avec vi.useFakeTimers / vi.setSystemTime.
- Jour de la semaine : toujours via toWeekday (1 = lundi … 7 = dimanche), jamais getDay() directement.


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
- Implémenter uniquement ce qui est demandé. Proposer les idées
  en plus dans une section "Suggestions" du plan, sans les coder.
- Schéma Dexie : ne JAMAIS modifier une version existante.
  Tout changement = nouvelle db.version(n+1) avec upgrade() si besoin,
  et un test de migration.
- Les specs de docs/specs/ font foi. Si une demande les contredit
  ou si une spec est ambiguë : le signaler dans le plan, ne pas trancher seul.
- Toute opération qui supprime des données saisies par l'utilisateur
  (séries, séances) doit être explicitement demandée par la spec.
- Une tâche n'est terminée que si `npm run verify` passe.
