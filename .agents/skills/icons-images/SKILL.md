---
name: icons-images
description: Traitement et intégration des icônes de navigation (lucide-react), des pictogrammes musculaires (MuscleIcon) et des assets graphiques générés depuis design/. À charger pour tout travail visuel ou d'asset.
---

# Icônes & Assets Graphiques

## Icônes de navigation
- Utiliser exclusivement la bibliothèque `lucide-react` avec des imports nommés (arbre secouable / tree-shaking).
- Toujours positionner l'attribut `aria-hidden="true"` sur les icônes vectorielles décoratives.
- Styliser les couleurs uniquement via les classes utilitaires liées aux tokens `@theme`.

## Pictogrammes de groupes musculaires
- Rendu centralisé via `src/components/MuscleIcon.tsx`.
- Correspondance d'assets typée exhaustivement avec `Record<MuscleGroup, ...>` pour prévenir tout oubli de groupe.
- Toute icône générée ou assistée par IA doit être validée visuellement sur iPhone avant validation finale de la tâche.

## Traitement des images & scripts de génération
- Les fichiers originaux de haute résolution sont conservés dans `design/`.
- Les versions optimisées pour l'application sont générées dans `src/assets/` via un script Node exécutable et commité dans `scripts/` (ex. `scripts/generate-icons.mjs`).
- **Recoloration** : Les icônes SVG/PNG multicolores sont recolorées aux teintes exactes des tokens `@theme` par script automatisé, jamais par retouche manuelle.
- **Résolution 3x** : Dimensions du fichier généré = dimensions d'affichage × 3 (ex. 144 px pour un affichage en 48 px).
- **Mesures préalables** : Mesurer systématiquement les poids réels et les valeurs hexadécimales avant toute transformation d'image.
- Tout nouvel élément graphique nécessite une capture d'aperçu jointe pour validation avant intégration finale.
