---
name: muscle-icons
description: Utiliser pour créer ou modifier les icônes SVG des groupes musculaires (src/components/MuscleIcon.tsx). Ne pas utiliser pour les icônes lucide ni pour l'icône de l'app.
---

# Icônes des groupes musculaires

## Style (identique à lucide)
- viewBox 0 0 24 24, fill none, stroke currentColor, stroke-width 2, stroke-linecap et stroke-linejoin round.
- Tous les points entre 2 et 22 (marge de 2 px).
- 2 à 4 tracés par icône. Pas de silhouette complète, pas de texte.
- Les paires proches doivent se distinguer à 24 px : Biceps/Triceps, Quadriceps/Ischios, Pectoraux/Dos.

## Processus obligatoire
1. Avant de dessiner, écrire un tableau : groupe → forme choisie en une phrase.
2. Créer une page d'aperçu temporaire (non commitée) : les 11 icônes à 24 px et 64 px, fond noir, couleur or du design, nom sous chaque icône.
3. Ouvrir la page dans le navigateur de l'agent, faire une capture et l'analyser icône par icône : reconnaissable ? cohérente avec les autres ?
4. Corriger, puis refaire la capture. 3 tours maximum.
5. Joindre la capture finale au walkthrough. Supprimer la page d'aperçu avant le commit.

## Interdit
- Couleur écrite en dur, fill, dégradé, texte dans le SVG, nouvelle dépendance.
