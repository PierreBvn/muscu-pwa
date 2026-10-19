---
name: db-migrations
description: Protocole strict de migration de schéma Dexie (IndexedDB), versionnage, types historiques, isolation du code de migration et tests de parité. À charger dès qu'une modification touche la base de données.
---

# Migrations Dexie

## Règles fondamentales
- **Immuabilité des versions existantes** : Ne JAMAIS modifier une version de schéma existante (`db.version(n)`). Tout changement nécessite une nouvelle version `db.version(n+1)` avec un bloc `upgrade()`.
- **Fichier dédié** : Chaque migration vit dans son propre fichier autonome `src/db/migrations/vN-*.ts`.
- **Code autonome et figé** : Le fichier de migration contient ses propres copies des valeurs, dictionnaires et tables de correspondance ; il n'importe aucune constante ni type actif de l'application.
- **Typage historique strict** : Les anciennes structures portent leur propre type (`Legacy...`) au sein de la migration ; interdiction formelle d'utiliser `as any`.

## Logique de migration
- **Algorithme unique** : Un seul et même algorithme pour toutes les données, données par défaut (seed) comprises ; aucun cas spécial par nom d'exercice ou d'entité.
- **Mots-clés et correspondances** : Les correspondances par mots-clés possèdent un ordre de priorité documenté par écrit. Mots-clés et noms comparés sont normalisés (minuscules, sans accents).
- **Pas d'ajout de données** : Une migration ne doit jamais ajouter de nouvelles données (aucun seed réinjecté chez un utilisateur existant).
- **Données archivées & valeurs inconnues** : Une migration traite également toutes les données archivées. Une valeur inconnue n'est jamais altérée.
- **Transaction atomique** : Tout le code s'exécute dans le hook `upgrade()` de Dexie ; la moindre erreur annule l'intégralité de la transaction (rollback).

## Tests de migration
- **Test de parité obligatoire** : Chaque migration dispose d'un test automatisé vérifiant que le nombre d'enregistrements de chaque table est rigoureusement identique avant et après migration.
- **Mise à jour des tests existants** : L'adaptation des tests existants suite à une migration modifie uniquement les valeurs des fixtures de données, jamais la sémantique de ce que le test vérifie.
