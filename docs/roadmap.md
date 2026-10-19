# Feuille de route (Roadmap)

Ce document liste l'état d'avancement des différents lots du projet Muscu PWA. Il fait autorité sur l'ordre des tâches.

---

## Lots terminés (Fait)

- [x] **Lot 1 — Séances et programmes**
  - Schéma Dexie initial (`exercises`, `programs`, `programExercises`, `sessions`, `sessionExercises`, `sets`).
  - Déroulement d'une séance (démarrage, saisie des séries, historique, reprise de séance oubliée).
  - Navigation par onglets mobile (Séance, Séances types, Exercices).

- [x] **Lot 2 — Groupes musculaires**
  - Migration vers les 11 groupes musculaires anatomiques.
  - Icônes SVG/PNG recolorées aux couleurs des tokens.
  - Composant partagé `ExercisePicker` et grille `MuscleGroupGrid`.

- [x] **Lot 3 — Sauvegarde et restauration**
  - Logique complète dans `src/db/backup.ts` (export, validation stricte, restauration transactionnelle).
  - Tests d'aller-retour complets et gestion du rollback.
  - Interface dédiée intégrée dans l'écran Paramètres.

- [x] **Lot 4 — Statistiques et progression**
  - Moteur de calcul statistique pur (`src/db/stats.ts`) : poids moyen par rep, records personnels, indice hebdomadaire.
  - Graphique temporel SVG natif (`LineChart`).
  - Onglet Progrès avec vues Général, Muscles et Exercices.

- [x] **Écran Paramètres**
  - Accès depuis l'en-tête de la vue Séance.
  - Stockage tolérant des réglages dans `localStorage` (`src/settings.ts`) : `restSeconds`, `restSound`, `keepAwake`.
  - Section Données (export JSON, import avec `ConfirmDialog`, tout effacer).
  - Section À propos (version dynamique de l'application).

---

## Lots à venir (À faire)

- [ ] **Lot 5 — Minuteur de repos**
  - Déclenchement automatique ou manuel du minuteur après une série.
  - Prise en compte des réglages stockés (`restSeconds`, `restSound`, `keepAwake`).
  - Retour visuel et sonore hors-ligne.

- [ ] **Lot 6 — Préparation production et PWA**
  - Audit d'installation sur iPhone iOS 18 (manifeste, icônes, cache Service Worker hors-ligne).
  - Validation finale export/import de production.
