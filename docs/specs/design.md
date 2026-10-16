# Design — noir & or

## Principes
- Épuré : beaucoup de noir, peu d'éléments, pas de dégradés ni d'ombres colorées.
- Le jaune est rare : action principale, onglet actif, valeur sélectionnée. Jamais en fond de carte.
- Pas de violet, indigo, bleu ni dégradé.

## Couleurs (tokens Tailwind v4 dans @theme)
| Token | Valeur | Usage |
|---|---|---|
| bg | #0A0A0A | fond de l'app |
| surface | #141414 | cartes, modales |
| surface-2 | #1C1C1C | champs, boutons secondaires |
| line | #262626 | bordures 1px |
| text | #F5F5F4 | texte principal |
| muted | #8A8A85 | texte secondaire |
| gold | #E8B931 | accent |
| gold-ink | #0A0A0A | texte posé sur fond gold |
| danger | #E5484D | suppression uniquement |

## Typographie
- Police système (SF Pro sur iPhone), aucune police externe (hors-ligne, zéro dépendance).
- Titres : semibold, légèrement resserrés (tracking-tight).
- Petits libellés : majuscules, text-xs, tracking-widest, couleur muted.
- Poids, reps, séries : tabular-nums (les chiffres ne bougent pas).

## Formes
- Rayons : 12px pour les cartes, 999px pour les chips et l'onglet actif.
- Bouton principal : fond gold, texte gold-ink, hauteur ≥ 48px.
- Bouton secondaire : fond surface-2, bordure line.
- Zones tactiles ≥ 44px (inchangé).
