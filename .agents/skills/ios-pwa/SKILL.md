---
name: ios-pwa
description: Règles de mise en page CSS, gestion des safe areas, défilement et comportement tactile spécifiques à iOS 18 Safari et PWA autonome. À charger pour tout travail d'interface, de style ou de correction de bug d'affichage.
---

# Spécificités iOS 18 & PWA

## Mise en page & Safe Areas
- L'en-tête et la barre de navigation sont en position `fixed`, jamais `sticky`.
- L'en-tête compense `safe-area-inset-top`, la barre de navigation `safe-area-inset-bottom`.
- Le contenu compense leurs hauteurs uniquement avec les variables CSS `var(--header-height)` et `var(--tabbar-height)`, jamais un chiffre recopié ni une classe comme `h-16`.
- La balise meta viewport contient `viewport-fit=cover`.
- `html` et `body` ont le fond du token `bg` et `overscroll-behavior: none`.
- `html` possède `min-height: calc(100% + env(safe-area-inset-top))` (contournement bug iOS PWA installée pour barre fixed touchant le bas). Ne pas retirer.
- Barres de défilement masquées sur `html`, `body` et tout conteneur défilant.
- Les espaces ajoutés pour le défilement sont calculés au plus juste, jamais égaux à une hauteur d'écran par défaut.
- Toute liste qui défile vers un élément prévoit un espace en bas pour atteindre la position voulue.

## Éléments fixes et superposition
- Aucun ancêtre d'un élément `fixed` ne doit porter `transform`, `filter`, `backdrop-filter`, `will-change` ou une animation.
- Aucun élément `fixed` (dialog, menu, modale) n'est rendu à l'intérieur d'un élément ayant `backdrop-blur`, `transform` ou `filter` (utiliser `Portal`).

## Champs de saisie & interaction
- Champs de saisie : `font-size ≥ 16px`, jamais d'`autoFocus`.
- Ne jamais bloquer le zoom utilisateur (pas de `maximum-scale` ni `user-scalable=no`).
- Toujours tester chaque correction de mise en page avec le clavier virtuel ouvert.

## Défilement programmatique
- Pour un défilement dépendant d'un changement de taille : appliquer la taille directement sur le DOM (`ref`) avant d'appeler `scrollTo`, jamais via un state React dans la même image.

## Diagnostic de bugs d'affichage
- Les tests jsdom ne voient pas la mise en page réelle : citer impérativement la cause dans le code (`fichier:ligne`) avant de corriger.
- Ne pas répéter une règle CSS qui existe déjà : si elle ne marche pas, la cause est ailleurs.
- Si la cause n'est pas dans le code, rechercher un bug connu du moteur WebKit/iOS.
- Captures du navigateur : seulement pour les tâches visuelles, en largeur 375 px, 3 au maximum.
- Tout plan touchant l'affichage se termine par une liste de vérifications manuelles à faire sur iPhone.
