---
name: backup
description: Procédures d'exportation, d'importation et de restauration des tables IndexedDB via src/db/backup.ts. À charger pour tout travail sur la sauvegarde ou le schéma Dexie.
---

# Sauvegarde & Restauration (IndexedDB)

## Emplacement & Accès
- Toute la logique d'exportation, de validation et d'importation réside exclusivement dans `src/db/backup.ts`.
- L'interface de sauvegarde/restauration est accessible uniquement depuis l'écran Paramètres.
- Ne jamais supprimer `backup.ts` ni sa suite de tests dédiée.

## Exportation
- L'export dynamique itère sur `db.tables` en direct, jamais sur une liste de tables codée en dur.
- Un test automatisé doit échouer immédiatement si une table du schéma Dexie est absente de la sauvegarde.
- Téléchargement du fichier JSON : utiliser `navigator.share({ files })` si `navigator.canShare`, sinon un élément `<a download>` associé à une URL Blob révoquée après usage ; ne jamais utiliser de data-URI (`data:`).

## Importation
- Validation préalable stricte avant toute écriture (rejet si structure invalide, mauvaise version de schéma ou tables manquantes/inconnues).
- Restauration totale dans une transaction unique en écriture sur l'ensemble de `db.tables`.
- Conservation absolue des identifiants (`id`) d'origine lors de l'insertion. En cas d'erreur, rollback automatique sans perte de données.

## Évolution du schéma
- Toute modification apportée au schéma Dexie (ajout/suppression de table) doit immédiatement être répercutée sur les tests aller-retour d'export/import.
