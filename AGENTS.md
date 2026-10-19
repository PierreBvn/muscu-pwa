# Muscu PWA

PWA de suivi de musculation (iPhone iOS 18, installée sur l'écran d'accueil, hors-ligne).
Stack : Vite, React 19, TypeScript strict, Tailwind CSS v4, Dexie (IndexedDB), Vitest.

## 5 Règles fondamentales
1. **Préproduction** : Projet en préproduction, sans données réelles : réinitialiser la base est acceptable, ne pas écrire de code de compatibilité pour d'anciennes données.
2. **Validation absolue** : Aucune tâche n'est terminée sans `npm run ship` (`npm run verify` à 0 erreur puis push).
3. **Architecture Dexie** : L'état d'une séance vit dans Dexie via `useLiveQuery` ; les composants n'importent jamais l'objet `db` en direct.
4. **Zéro calcul dans l'UI** : Les composants délèguent tous les calculs métier et filtrages à `src/db/`.
5. **Périmètre strict** : Traiter uniquement ce qui est demandé ; reporter tout besoin imprévu dans la tâche suivante.

## Architecture & Données
- Réutiliser les fonctions exportées de `src/db/` avant toute nouvelle implémentation.
- Séparer strictement les fonctions pures de calcul des fonctions de chargement `load...`.
- Calculer le jour de la semaine via `toWeekday`, jamais via `getDay()`.
- Comparer les dates ISO sous forme de chaînes 'YYYY-MM-DD' avec `<` et `>`, sans objet Date.
- Traiter chaque erreur explicitement (affichée ou ignorée avec motif documenté).

## Interface & Saisie
- Couleurs uniquement via les tokens `@theme` ; pas de couleur en dur, de dégradé ni de violet/indigo.
- Interface mobile d'abord : zones tactiles ≥ 44px, sans variante responsive `sm:`.
- Saisir les nombres en `type="text"` `inputMode="decimal"`, validés par `parseWeight` / `parseReps`.
- Confirmer toute action destructive ou irréversible via `ConfirmDialog` (`role="alertdialog"`).
- Rendre toute superposition (dialogue, menu, modale) via `Portal` selon l'échelle z-index de `index.css`.
- Une ligne sélectionnable est un unique `<button>`, sans bouton imbriqué ni texte d'aide superflu.
- Vocabulaire : « séance type » dans l'interface, `Program` dans le code.

## Workflow & Méthode
- Lire `docs/specs/<domaine>.md` avant de modifier un domaine qui a une spec.
- Consulter le `SKILL.md` dédié dès qu'un domaine spécialisé est abordé (ios-pwa, db-migrations, backup, stats, icons-images, tests, settings).
- Séparer en deux commits distincts toute modification touchant la base de données puis l'interface.
- Commiter les mises à jour de spécifications dans `docs/specs/` avant le code associé.
- Mettre à jour `docs/roadmap.md` dans le commit de clôture de chaque lot.
- Exécuter uniquement des commandes non interactives qui se terminent d'elles-mêmes.
- Formuler « cause non trouvée » si un diagnostic échoue, sans avancer d'hypothèse non vérifiée.

## Maintenance des règles
- `AGENTS.md` reste sous 100 lignes ; toute règle propre à un domaine va dans un skill.
- Avant d'ajouter une règle, vérifier qu'elle ne contredit ni ne duplique une règle existante.
