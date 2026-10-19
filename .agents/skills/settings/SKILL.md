---
name: settings
description: Gestion des réglages applicatifs dans src/settings.ts, typage et persistance dans localStorage via getSettings(). À charger lors de l'ajout ou de la modification d'un paramètre.
---

# Réglages Applicatifs (`src/settings.ts`)

## Emplacement & Persistance
- L'ensemble des préférences utilisateur et réglages d'application est centralisé dans `src/settings.ts`.
- Ces valeurs sont persistées dans le `localStorage` sous une clé unique (`SETTINGS_STORAGE_KEY = 'muscu_settings'`), jamais dans IndexedDB / Dexie.

## Lecture & Écriture sécurisées
- Toujours accéder aux réglages via `getSettings()`, qui garantit le renvoi d'un objet complet avec valeurs de repli par défaut (`DEFAULT_SETTINGS`) en cas d'absence, d'incohérence ou de corruption de données.
- Ne jamais manipuler directement `localStorage.getItem` ou `localStorage.setItem` en dehors de `src/settings.ts`.
- Pour mettre à jour un réglage, utiliser `updateSettings(partial)` ou `saveSettings(settings)`.

## Actions destructives
- Toute réinitialisation globale ou écrasement de paramètres doit être confirmée par l'utilisateur via le composant partagé `ConfirmDialog`.
