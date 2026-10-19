---
name: stats
description: Architecture et logique de calcul des statistiques (fonctions pures, indices de progression, records) et rendu des graphiques SVG personnalisés. À charger pour tout travail sur l'onglet Progrès ou src/db/stats.ts.
---

# Statistiques & Graphiques SVG

## Architecture & Fonctions Pures
- Toute la logique métier de calcul réside exclusivement dans `src/db/stats.ts` sous forme de fonctions pures synchrones.
- Une fonction pure reçoit tous ses arguments en paramètres (tableaux d'entités, dates de référence) : aucun appel Dexie, aucun `new Date()` interne, aucune `Promise`.
- Les accès à la base de données se font dans des fonctions préfixées `load...` séparées, exemptes de tout calcul métier.
- **Groupes musculaires** : Toute fonction qui regroupe ou agrège par `MuscleGroup` doit ignorer les valeurs hors énumération `MUSCLE_GROUPS` (héritage v3) et retourner obligatoirement un objet contenant exactement les 11 clés valides.

## Calculs & Métriques (selon docs/specs/stats.md)
- **Métrique principale** : Poids moyen par répétition = `somme(poids × reps) / somme(reps)`, sur les séries de travail (`type: 'work'`) uniquement. L'échauffement n'est jamais comptabilisé. Pas de formule d'Epley.
- **Record** : Série au poids maximal (en cas d'égalité : plus grand nombre de reps, puis la plus ancienne).
- **Indice de progression** : Moyenne arithmétique des progressions en pourcentage de chaque exercice par rapport à sa propre première semaine (jamais une moyenne brute des poids).
- **Aucun volume global** : La métrique de tonnage/volume brut (`poids × reps`) est exclue.
- **Robustesse** : Aucune division par zéro. Arrondi au pas de 0,5 kg réservé strictement à la couche d'affichage. Formatage manuel des nombres (pas de `Intl.NumberFormat`).

## Graphiques SVG sur mesure
- Dessin en SVG natif uniquement, sans bibliothèque tierce de graphiques.
- Tout calcul géométrique (échelles, bornes min/max, coordonnées des points et tracés) est encapsulé dans une fonction pure testée séparément, jamais dans le JSX.
- Couleurs issues exclusivement des tokens `@theme`.
- Accessibilité : attributs `role="img"` et `aria-label` explicites sur chaque graphique SVG.

## Tests unitaires
- Chaque exemple chiffré de la spécification `docs/specs/stats.md` est repris tel quel dans un test unitaire avec ses valeurs exactes.
