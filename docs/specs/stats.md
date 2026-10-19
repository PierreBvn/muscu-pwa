# Spécification des statistiques

Ce document définit les règles métier, les formats de données, les calculs et l'interface des statistiques de l'application Muscu PWA.
Il fait autorité pour l'implémentation du moteur de calcul (`src/db/stats.ts`) et de l'interface associée (`src/features/stats/`).

---

## 1. Données sources

Les calculs s'appuient exclusivement sur les champs suivants du schéma Dexie défini dans `src/db/schema.ts` :

| Entité | Champ | Référence schéma | Rôle |
|---|---|---|---|
| `SetEntry` | `weight` | `src/db/schema.ts:54` | Charge soulevée en kg pour la série |
| `SetEntry` | `reps` | `src/db/schema.ts:53` | Nombre de répétitions exécutées |
| `SetEntry` | `type` | `src/db/schema.ts:55` | Type de série (`'warmup'` ou `'work'`) |
| `SetEntry` | `createdAt` | `src/db/schema.ts:56` | Horodatage ISO pour l'antériorité des records |
| `SetEntry` | `sessionId` | `src/db/schema.ts:50` | Identifiant de la séance rattachée |
| `Session` | `date` | `src/db/schema.ts:40` | Date locale de la séance (`YYYY-MM-DD`) pour le regroupement hebdomadaire |
| `Session` | `endedAt` | `src/db/schema.ts:43` | Date de fin ISO ; sa présence valide la séance |
| `Exercise` | `muscleGroup` | `src/db/schema.ts:33` | Groupe musculaire parmi les 11 groupes pour les séries hebdomadaires |

---

## 2. Règles métier

### 2.1 Séries de travail uniquement
Les fonctions de calcul qui reçoivent des séries filtrent elles-mêmes `type === 'work'`. L'appelant n'a aucun préfiltrage à effectuer.
Les séries d'échauffement (`type === 'warmup'`) sont strictement ignorées dans l'ensemble des statistiques (poids moyen, record personnel, séries hebdomadaires).

*Exemple chiffré :*
- 1 série d'échauffement : 40 kg × 10 reps (`type: 'warmup'`)
- 2 séries de travail : 80 kg × 10 reps (`type: 'work'`), 85 kg × 8 reps (`type: 'work'`)
- Seules les séries de 80 kg et 85 kg sont prises en compte ; la série à 40 kg est ignorée.

### 2.2 Séances terminées uniquement
Toute séance sans date de fin (`endedAt === undefined` ou non renseigné) est une séance en cours ou abandonnée. Elle est strictement exclue de tous les calculs (courbe de progression, record personnel et décompte des séries hebdomadaires).
Le filtrage de `endedAt` est opéré au niveau des fonctions qui traitent les sessions (`buildExerciseProgression` et `calculateWeeklyWorkSetsByGroup`).

*Exemple chiffré :*
- Séance 1 (terminée le 10/10/2026, `endedAt: '2026-10-10T11:00:00.000Z'`) : 100 kg × 5 reps (`type: 'work'`).
- Séance 2 (en cours le 12/10/2026, `endedAt: undefined`) : 110 kg × 5 reps (`type: 'work'`).
- Record personnel calculé : 100 kg × 5 reps. La séance 2 est ignorée tant qu'elle n'est pas terminée.

### 2.3 Métrique principale : Poids moyen par rep
Le poids moyen par rep est calculé par exercice et par séance terminée selon la formule :

$$\text{Poids moyen} = \frac{\sum (\text{poids} \times \text{reps})}{\sum \text{reps}}$$

sur l'ensemble des séries de travail (`type === 'work'`) de l'exercice au cours de la séance.
Aucune formule d'Epley ni estimation 1RM n'est utilisée.

#### Précision et arrondi
- Les calculs conservent la précision flottante exacte.
- L'arrondi à 0,5 kg le plus proche (`Math.round(valeur * 2) / 2`) s'applique **uniquement à l'affichage**, jamais dans le stockage ni les calculs intermédiaires.
- Format d'affichage exact (avec espace insécable `\u00A0` avant « kg ») :
  - Nombre entier sans décimale superflue si le nombre tombe rond : `'19\u00A0kg'`, `'83\u00A0kg'`.
  - Décimale avec virgule pour les demi-kilos : `'18,5\u00A0kg'`.

#### Exemples obligatoires exacts (chaînes de test Vitest) :
- **Exemple a** : 20 kg × 8 reps, 18 kg × 10 reps
  - Répétitions : $8 + 10 = 18\text{ reps}$
  - Calcul exact : $(20 \times 8 + 18 \times 10) / 18 = 340 / 18 \approx 18{,}8888\dots\text{ kg}$
  - **Chaîne attendue : `'19\u00A0kg'`**
- **Exemple b** : 80 kg × 10 reps, 85 kg × 8 reps, 85 kg × 7 reps
  - Répétitions : $10 + 8 + 7 = 25\text{ reps}$
  - Calcul exact : $(80 \times 10 + 85 \times 8 + 85 \times 7) / 25 = 2075 / 25 = 83{,}00\text{ kg}$
  - **Chaîne attendue : `'83\u00A0kg'`**
- **Exemple c** : 20 kg × 8 reps, 18 kg × 14 reps
  - Répétitions : $8 + 14 = 22\text{ reps}$
  - Calcul exact : $(20 \times 8 + 18 \times 14) / 22 = 412 / 22 \approx 18{,}7272\dots\text{ kg}$
  - **Chaîne attendue : `'18,5\u00A0kg'`**

### 2.4 Séries allégées en fin de séance (« back-off »)
Une série allégée en fin d'exercice (back-off) reste une série de travail normale (`type: 'work'`). Aucun nouveau type de série n'est introduit dans le schéma. Elle est incluse dans le calcul du poids moyen de la séance.

*Exemple chiffré :*
- 3 séries lourdes : 100 kg × 5 reps, 100 kg × 5 reps, 100 kg × 5 reps
- 1 série back-off : 70 kg × 12 reps
- Somme répétitions : $15 + 12 = 27\text{ reps}$
- Poids moyen exact : $(100 \times 5 \times 3 + 70 \times 12) / 27 = 2340 / 27 \approx 86{,}666\dots\text{ kg}$ $\rightarrow$ **Chaîne attendue : `'86,5\u00A0kg'`**

### 2.5 Record personnel de l'exercice
Le record est la série la plus performante jamais réalisée sur l'exercice à travers toutes les séances terminées, parmi les séries de type `'work'`.

**Ordre strict de départage :**
1. Poids maximal (`weight` le plus élevé) ;
2. En cas d'égalité de poids : nombre de répétitions maximal (`reps` le plus élevé) ;
3. En cas d'égalité de poids et de répétitions : série la plus ancienne (`createdAt` le plus antérieur).

**Format d'affichage exact :**
- Espace insécable `\u00A0` avant le deux-points `:`, après le `:`, avant `kg`, avant et après le signe de multiplication `\u00D7` (« × »).
- Chaîne attendue en test : `'Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08'`.
- Repère sur la courbe : point or (`var(--color-gold)`) sur la séance concernée.

*Exemple chiffré d'égalité :*
- Séance du 10/10/2026 (`createdAt: '2026-10-10T10:05:00.000Z'`) : 85 kg × 8 reps
- Séance du 15/10/2026 (`createdAt: '2026-10-15T10:05:00.000Z'`) : 85 kg × 8 reps
- Record retenu : celle du 10/10/2026 car chronologiquement antérieure.

### 2.6 Séries de travail par groupe et par semaine
Nombre de séries de travail (`type === 'work'`) des séances terminées par semaine calendaire du lundi au dimanche, selon la date locale de la séance (`sessions.date`).
- La fonction reçoit une date de référence sous forme de chaîne `'YYYY-MM-DD'` (jamais d'objet `Date`).
- Les comparaisons de dates sont effectuées directement sous forme de chaînes de caractères `'YYYY-MM-DD'` (`date >= startOfWeek && date <= endOfWeek`).
- La fonction renvoie un dictionnaire complet des 11 groupes musculaires définis dans `MUSCLE_GROUPS`, chacun valant `0` si aucune série de travail n'a été effectuée pendant la semaine.

*Exemple chiffré complet avec exclusion hors-semaine :*
- Semaine ciblée : du **lundi 12/10/2026 au dimanche 18/10/2026** (`'2026-10-12'` à `'2026-10-18'`).
  - Séance du mardi 13/10/2026 (`'2026-10-13'`, terminée) : 3 séries travail Développé couché (Pectoraux) + 3 séries travail Barre au front (Triceps).
  - Séance du vendredi 16/10/2026 (`'2026-10-16'`, terminée) : 4 séries travail Écarté haltères (Pectoraux).
  - Séance du lundi 19/10/2026 (`'2026-10-19'`, terminée) : 3 séries travail Développé incliné (Pectoraux). Cette séance est **strictement exclue** car elle appartient à la semaine suivante (`'2026-10-19'` à `'2026-10-25'`).
- Résultat pour la semaine du 12/10/2026 au 18/10/2026 :
  - `Pectoraux` : $3 + 4 = 7$ séries
  - `Triceps` : $3$ séries
  - `Dos`, `Épaules`, `Biceps`, `Avant-bras`, `Abdos`, `Quadriceps`, `Ischios`, `Fessiers`, `Mollets` : $0$ série chacun.

### 2.7 Indice général de progression en poids (8 semaines)
L'indice général mesure l'évolution globale de la force sur les **8 semaines calendaires consécutives (du lundi au dimanche)** se terminant par celle de `referenceDate` ('YYYY-MM-DD').
Il neutralise les effets de composition d'exercices en moyennant les progressions individuelles de chaque exercice par rapport à lui-même.

#### Règles de calcul :
a) **Poids moyen par rep hebdomadaire** : Pour chaque exercice et chaque semaine $W$ de la période, on calcule le poids moyen par rep de toutes ses séries de travail (`type === 'work'`) des séances terminées (`endedAt !== undefined`).
b) **Indice par exercice** : Pour chaque exercice éligible, la première semaine de la période où il est réalisé avec un poids moyen $> 0\text{ kg}$ sert de semaine de référence ($V_{base}$). Pour toute semaine $W$ où l'exercice est réalisé :
   $$\text{Indice}(ex, W) = \frac{\text{Poids moyen}(ex, W)}{V_{base}} \times 100$$
   En semaine de référence, $\text{Indice} = 100$.
c) **Indice général de la semaine** : Moyenne simple des indices des exercices éligibles réalisés pendant cette semaine :
   $$\text{Indice général}(W) = \frac{\sum_{ex \in E_W} \text{Indice}(ex, W)}{|E_W|}$$
   Si aucun exercice éligible n'a été réalisé pendant la semaine ($|E_W| = 0$), l'indice de la semaine vaut `null`.
d) **Exclusion des exercices à 0 kg** : Tout exercice dont toutes les séries de travail sur l'ensemble de la période des 8 semaines sont à 0 kg (ex. tractions ou dips au poids du corps strict) est strictement exclu du calcul de l'indice.
e) **Nombre de séances terminées** : Décompte du nombre de séances terminées (`endedAt !== undefined`) par semaine calendaire sur les 8 semaines.

#### Exemple obligatoire (comparaison avec la moyenne brute) :
- **Semaine 1** :
  - Développé couché : 80 kg ($V_{base} = 80$, indice = 100)
  - Curl biceps : 15 kg ($V_{base} = 15$, indice = 100)
  - Presse à cuisses : 200 kg ($V_{base} = 200$, indice = 100)
  - $\text{Indice S1} = (100 + 100 + 100) / 3 = 100$
- **Semaine 2** :
  - Développé couché : 84 kg $\rightarrow 84 / 80 \times 100 = 105$ (+5 %)
  - Curl biceps : 16 kg $\rightarrow 16 / 15 \times 100 = 106{,}666\dots$ (+6,7 %)
  - Presse à cuisses : absente
  - $\text{Indice S2} = (105 + 106{,}666\dots) / 2 = 105{,}833\dots \rightarrow$ **« +5,8 % »**.
- **Justification du choix face à la moyenne brute** :
  - Si l'on calculait la moyenne brute des poids soulevés :
    - S1 : $(80 + 15 + 200) / 3 = 98{,}33\text{ kg}$.
    - S2 : $(84 + 16) / 2 = 50{,}00\text{ kg}$.
  - La moyenne brute chuterait de 98,3 kg à 50 kg par la seule absence de la presse, alors même que l'athlète a progressé sur tous les exercices exécutés (+5 % et +6,7 %). Le calcul par indice en % de chaque exercice par rapport à lui-même reflète fidèlement la progression réelle.

### 2.8 Indice de progression et séries de travail par groupe musculaire (8 semaines)
L'indice de progression d'un groupe musculaire suit le même algorithme que l'indice général (section 2.7), restreint aux exercices dont le groupe musculaire correspond (`exercise.muscleGroup === muscleGroup`) :
- Seules les séances terminées (`endedAt !== undefined`) sont prises en compte.
- Les exercices du groupe dont toutes les séries de travail sur les 8 semaines sont à 0 kg sont strictement exclus.
- Pour chaque exercice éligible du groupe, sa première semaine dans la période avec un poids moyen $> 0\text{ kg}$ sert de semaine de base ($V_{base}$).
- Pour chaque semaine de la période, l'indice du groupe est la moyenne simple des indices des exercices du groupe réalisés cette semaine-là (ou `null` si aucun exercice du groupe n'a été fait).
- Les séries de travail (`type === 'work'`) du groupe sont comptabilisées pour chaque semaine des 8 semaines consécutives se terminant par celle de `referenceDate`.
- L'ensemble des 11 groupes de `MUSCLE_GROUPS` est géré de manière exhaustive ; tout groupe hors `MUSCLE_GROUPS` est ignoré.

*Exemple obligatoire chiffré pour un groupe musculaire :*
- Groupe ciblé : `Pectoraux` sur les 8 semaines se terminant le 18/10/2026 (`referenceDate: '2026-10-18'`).
- Semaine 7 (du 05/10 au 11/10) : Développé couché à 80 kg ($V_{base} = 80$, indice = 100), 3 séries work.
- Semaine 8 (du 12/10 au 18/10) : Développé couché à 84 kg $\rightarrow 84 / 80 \times 100 = 105$ (+5 %), 4 séries work.
- Résultat pour `Pectoraux` :
  - Semaine 7 : `index: 100`, `workSets: 3`.
  - Semaine 8 : `index: 105`, `workSets: 4`, variation actuelle $\rightarrow$ **« +5,0 % »**.
  - Semaines 1 à 6 : `index: null`, `workSets: 0`.

### 2.9 Vue d'ensemble des 11 groupes musculaires
Pour alimenter la grille des 11 groupes musculaires de l'onglet Progrès :
- Le moteur calcule pour chaque groupe de `MUSCLE_GROUPS` sa progression sur les 8 semaines (`MuscleGroupProgression`).
- La fonction renvoie **exactement 11 clés** (une par élément de `MUSCLE_GROUPS`).
- Chaque groupe fournit son `currentChange` formaté (ex. `'+5,0\u00A0%'` ou `'—'` si aucune séance du groupe n'est présente sur les 8 semaines) et le nombre de séries work de la semaine de référence.

### 2.10 Formatage de la variation d'indice (`formatIndexChange`)
L'affichage de la variation de l'indice général et de chaque groupe musculaire compare la valeur de l'indice à 100 :
$$\text{Écart} = \text{Indice} - 100$$
- **Règles strictes** :
  - Formatage manuel sans `Intl` ni `toLocaleString`.
  - Arrondi à 1 décimale avec virgule `,`.
  - Espace insécable `\u00A0` avant le symbole `%`.
  - Si l'écart est strictement positif : préfixé du signe `+` (ex. `« +5,8 % »` $\rightarrow$ `'+5,8\u00A0%'`).
  - Si l'écart est strictement négatif : préfixé du véritable signe moins Unicode `\u2212` (ex. `« −2,0 % »` $\rightarrow$ `'−2,0\u00A0%'`).
  - Si l'écart arrondi est nul : affiché `'0,0\u00A0%'` sans signe.
  - Si l'indice est `null` (aucun exercice fait) : affiché `'—'` (U+2014).

### 2.11 Formatage des séries de travail (`formatStatSets`)
Le décompte des séries de travail est formaté manuellement au singulier/pluriel avec espace insécable `\u00A0` :
- $0$ série : `'0\u00A0série'`
- $1$ série : `'1\u00A0série'`
- $\ge 2$ séries : `${sets}\u00A0séries` (ex. `'7\u00A0séries'`).

---

## 3. Cas limites et comportements attendus

### 3.1 Mode du graphique ('weight' vs 'reps')
Le mode du graphique est déterminé en analysant l'ensemble des séances terminées de l'exercice :
- **Mode `'reps'`** : Si **toutes** les séries de travail (`type === 'work'`) de l'exercice sur toutes les séances terminées ont un poids de 0 kg, la courbe affiche le total de répétitions de travail par séance ($\sum reps$). L'axe vertical est gradué en répétitions.
- **Mode `'weight'`** : Dès lors qu'**au moins une** série de travail de l'exercice a un poids $> 0\text{ kg}$ dans l'historique, le mode est `'weight'` (poids moyen par rep). **Les séances entièrement à 0 kg n'ont pas de point sur la courbe**.

*Exemple chiffré :*
- Séance 1 : Tractions sans leste (0 kg × 10, 0 kg × 8) $\rightarrow$ uniquement 0 kg.
- Séance 2 : Tractions sans leste (0 kg × 10, 0 kg × 10) $\rightarrow$ uniquement 0 kg.
- Séance 3 : Tractions lestées (10 kg × 6, 10 kg × 6) $\rightarrow$ au moins une série $> 0\text{ kg}$.
- Résultat : Au moins une série ayant un poids $> 0\text{ kg}$, le mode retenu est `'weight'`. Les séances 1 et 2 n'ont aucun point tracé sur la courbe. Seule la séance 3 a un point tracé à 10 kg.

### 3.2 Tableau récapitulatif des cas limites

| Cas limite | Règle & résultat attendu | Exemple chiffré |
|---|---|---|
| **Exercice à 0 kg uniquement (poids du corps strict)** | Toutes les séries de toutes les séances sont à 0 kg. La courbe bascule en mode `'reps'`. | Séries : 0 kg × 10, 0 kg × 8, 0 kg × 7 $\rightarrow$ Courbe affiche **25 reps**, Record : `'Record\u00A0:\u00A00\u00A0kg\u00A0\u00D7\u00A010'`. |
| **Total de répétitions = 0** | **Aucune division par zéro**. Si $\sum reps = 0$ ou aucune série `'work'`, la fonction renvoie `null`. | Séance sans répétition valide $\rightarrow$ renvoie `null`, tiret `« — »` affiché, aucun point sur la courbe. |
| **Séance en cours** | Exclue car `endedAt` est absent ou indéfini. | Voir section 2.2. |
| **Exercice archivé** | Dans `src/db/exercises.ts:143`, `filterExercises` exclut par défaut les archivés (`if (ex.archived) return false;`). `ExercisePicker` (`src/components/ExercisePicker.tsx:39`) les masque donc actuellement. La spec ajoute une prop optionnelle `includeArchived?: boolean` (défaut `false`, comportement actuel inchangé) à `ExercisePicker` et `filterExercises` pour permettre de consulter les statistiques d'un exercice archivé. | L'exercice archivé sélectionné affiche ses statistiques complètes sans section « Archivés » dédiée. |
| **Séance sans série pour l'exercice** | Aucun point tracé pour cette séance sur la courbe de l'exercice. | La séance n'a pas inclus cet exercice $\rightarrow$ ignorée sur sa courbe. |
| **Valeur constante ou séance unique ($min = max = V$)** | Pour le poids : axe Y borné à $[V - 2{,}5\text{ kg} ; V + 2{,}5\text{ kg}]$. Pour les reps : axe Y borné à $[\max(0, V - 5) ; V + 5\text{ reps}]$. Pour l'indice (`mode === 'index'`) : axe Y borné à $[V - 2{,}5 ; V + 2{,}5\text{ points}]$ (ex. pour un indice constant à 100 : $[97{,}5 ; 102{,}5]$, graduations `'−2,5\u00A0%'` et `'+2,5\u00A0%'`). | 1 séance à 60 kg $\rightarrow$ Axe Y va de 57,5 kg à 62,5 kg. Indice constant à 100 $\rightarrow$ Axe Y de 97,5 à 102,5. |
| **Étendue temporelle** | Pour un exercice : toutes ses séances terminées chronologiquement. Pour le Général et les Muscles : les 8 semaines calendaires consécutives (du lundi au dimanche) se terminant par celle de `referenceDate`. | 8 semaines affichées horizontalement de gauche à droite. |

---

## 4. Interface utilisateur : 4e onglet « Progrès »

### 4.1 Intégration dans la barre de navigation
- Disposition dans `src/components/TabBar.tsx` : 4 colonnes (`grid-cols-4`).
- **Caractéristiques de l'onglet :**
  - Identifiant : `'progress'`
  - Libellé : `Progrès`
  - Icône : `TrendingUp` de `lucide-react` (taille 24px, `strokeWidth={2}`, `aria-hidden="true"`).
- La zone tactile respecte $\ge 48\text{px}$ de hauteur et $\ge 44\text{px}$ de largeur.
- La hauteur reste fixée par `var(--tabbar-height)` avec `pb-[env(safe-area-inset-bottom)]`.

### 4.2 Les 3 vues de l'onglet Progrès
En haut de l'écran, un contrôle segmenté (`role="tablist"`) permet de basculer entre les trois vues :
- Options : « Général », « Muscles », « Exercices ».
- Vue sélectionnée par défaut : **Général**.
- La barre de défilement est masquée, zones tactiles $\ge 44\text{px}$.

#### Vue 1 : Général (par défaut)
- Affiche la progression globale de la force sur les 8 semaines consécutives.
- En haut : cartouche de résumé indiquant la variation de la dernière semaine (`currentChange`, ex. `'+5,8\u00A0%'`).
- Graphique : courbe de l'indice sur 8 semaines via `LineChart` (`mode="index"`).
- Si aucune séance éligible sur la période : affiche sobrement `« Aucune séance »`. Aucun autre texte.

#### Vue 2 : Muscles
- **Écran principal (vue grille)** :
  - Grille des 11 groupes musculaires (réutilisation du composant partagé `MuscleGroupGrid` avec la prop `subtitles` pour afficher l'indice sous chaque nom de groupe).
  - Chaque tuile affiche l'icône `MuscleIcon`, le nom du groupe et sa variation actuelle (`currentChange`, ex. `'+5,0\u00A0%'` ou `'—'` si aucune séance).
- **Écran de détail d'un groupe** (au clic sur une tuile) :
  - Bouton retour en haut à gauche pour revenir à la grille des muscles (`« ← Tous les muscles »`).
  - En-tête avec l'icône `MuscleIcon` et le nom du groupe.
  - Cartouche de résumé avec :
    - La variation d'indice de la dernière semaine (`currentChange`).
    - Les séries de travail de la dernière semaine (`formatStatSets`, ex. `'4\u00A0séries'`).
  - Graphique : courbe de l'indice du groupe sur 8 semaines via `LineChart` (`mode="index"`).
  - Récapitulatif hebdomadaire : liste des 8 semaines indiquant pour chacune l'intervalle et son nombre de séries work formaté (`formatStatSets`).
  - Si aucune séance pour ce groupe : affiche sobrement `« Aucune séance »`. Aucun autre texte.

#### Vue 3 : Exercices
- Conserve fidèlement l'interface existante :
  - Bouton de choix d'exercice ouvrant `ExercisePicker` (`includeArchived={true}`).
  - Cartouche de résumé : poids moyen de la dernière séance terminée, puis le record personnel s'il existe.
  - Graphique : courbe de progression de l'exercice (`mode="weight"` ou `mode="reps"`).
  - Si aucune séance pour l'exercice : affiche sobrement `« Aucune séance »`. Aucun autre texte.

#### Règle stricte d'interface
- Aucun calcul ni formatage dans les composants : uniquement via `src/db/`.
- En l'absence de données : `« Aucune séance »`. Aucun texte d'aide ni sous-titre superflu.

---

## 5. Rendu des graphiques : Comparatif et recommandation

### 5.1 Tableau comparatif

| Solution | Version | Poids minifié | Poids gzip | Source | Rendu |
|---|---|---|---|---|---|
| **Recharts** | `3.10.1` | ~553 kB | ~148 kB | Bundlephobia ([source](https://bundlephobia.com/package/recharts)) | SVG (React) |
| **Chart.js** | `4.4.8` | ~190 kB | ~66.8 kB | Bundlephobia ([source](https://bundlephobia.com/package/chart.js)) | Canvas |
| **uPlot** | `1.6.31` | ~70 kB | ~21.3 kB | Bundlephobia ([source](https://bundlephobia.com/package/uplot)) | Canvas |
| **SVG React maison** | — | — | — | Composant React interne sans dépendance tierce | **SVG natif** |

### 5.2 Recommandation unique (sans alternative)
**Recommandation retenue : SVG React maison.**
- **0 dépendance externe ajoutée** : respect de la règle d'économie de bundle pour une PWA mobile hors-ligne.
- **Netteté vectorielle absolue sur écran Retina iPhone** sans gestion manuelle de résolution Canvas (`devicePixelRatio`).
- **Application directe des tokens Tailwind CSS** (`stroke-gold`, `fill-gold`, `stroke-line`, `text-muted`).
- **Accessibilité et contrôle total** du balisage SVG responsive (`viewBox`).

---

## 6. Découpage technique et signatures

### 6.1 Lot 4b : Fonctions pures et lecture Dexie (`src/db/stats.ts`)

#### Fonctions pures de calcul (aucun appel Dexie)
Les fonctions qui ne reçoivent que des séries (`calculateAverageWeight`, `calculateSessionReps`, `findPersonalRecord`) filtrent uniquement `type === 'work'`.
Le filtrage des séances terminées (`endedAt !== undefined`) est opéré uniquement dans les fonctions qui reçoivent le tableau `sessions` (`buildExerciseProgression` et `calculateWeeklyWorkSetsByGroup`).
Toutes les dates manipulées sont des chaînes au format `'YYYY-MM-DD'` (aucun objet `Date`) :

```typescript
// Poids moyen par rep pour une séance (renvoie null si sum(reps) === 0 ou pas de série work)
export function calculateAverageWeight(sets: SetEntry[]): number | null;

// Total de répétitions des séries work (pour le mode 0 kg poids du corps)
export function calculateSessionReps(sets: SetEntry[]): number;

// Série record selon les 3 critères de départage (poids max, reps max, ancienneté)
export function findPersonalRecord(sets: SetEntry[]): SetEntry | null;

// Formatage du poids (arrondi 0,5 kg le plus proche) : ex. "19\u00A0kg", "18,5\u00A0kg"
export function formatStatWeight(weight: number): string;

// Formatage du record personnel : ex. "Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08"
export function formatPersonalRecord(record: SetEntry): string;

// Formatage des répétitions (mode reps) : ex. "25\u00A0reps", "1\u00A0rep", "0\u00A0rep"
export function formatStatReps(reps: number): string;

// Calcul de l'intervalle hebdomadaire (lundi au dimanche) en UTC à partir de 'YYYY-MM-DD'
export function getWeekRangeUtc(referenceDate: string): {
  startOfWeek: string;
  endOfWeek: string;
};

// Point de donnée pour la courbe d'un exercice
export interface ExerciseStatPoint {
  sessionId: number;
  date: string;
  averageWeight: number | null;
  totalReps: number;
  isRecord: boolean;
}

export interface ExerciseProgression {
  mode: 'weight' | 'reps';
  points: ExerciseStatPoint[];
  personalRecord: SetEntry | null;
}

// Construction de la progression d'un exercice sur les séances terminées (filtre endedAt)
export function buildExerciseProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exerciseId: number;
}): ExerciseProgression;

// Séries de travail hebdomadaires par groupe musculaire (renvoie les 11 groupes, 0 si vide)
// referenceDate est une chaîne 'YYYY-MM-DD' comparée à sessions.date
export function calculateWeeklyWorkSetsByGroup(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, number>;

// Calcul des 8 plages de semaines calendaires consécutives (lundi au dimanche) se terminant à referenceDate
export function getEightWeeksRangeUtc(referenceDate: string): Array<{
  startOfWeek: string;
  endOfWeek: string;
}>;

// Formatage de la variation d'indice par rapport à 100 : ex. "+5,8\u00A0%", "−2,0\u00A0%", "0,0\u00A0%"
export function formatIndexChange(index: number | null): string;

// Point hebdomadaire pour la progression générale
export interface WeeklyGeneralStatPoint {
  weekStart: string; // 'YYYY-MM-DD' (lundi)
  weekEnd: string;   // 'YYYY-MM-DD' (dimanche)
  index: number | null; // moyenne des indices des exercices de la semaine, ou null
  sessionCount: number; // nombre de séances terminées dans la semaine
}

export interface GeneralProgression {
  weeks: WeeklyGeneralStatPoint[];
  currentChange: string; // variation formatée pour la semaine courante (ex. "+5,8\u00A0%")
}

// Calcul de la progression générale sur 8 semaines (indice et nombre de séances)
export function calculateGeneralProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): GeneralProgression;

// Statistiques musculaires pour la semaine de référence (11 groupes)
export interface MuscleGroupWeeklyStat {
  workSets: number;
}

export function calculateWeeklyMuscleStats(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, MuscleGroupWeeklyStat>;

// Formatage du nombre de séries de travail : ex. "7\u00A0séries", "1\u00A0série", "0\u00A0série"
export function formatStatSets(sets: number): string;

// Point hebdomadaire pour un groupe musculaire
export interface WeeklyMuscleStatPoint {
  weekStart: string; // 'YYYY-MM-DD' (lundi)
  weekEnd: string;   // 'YYYY-MM-DD' (dimanche)
  index: number | null; // moyenne des indices des exercices du groupe, ou null
  workSets: number;  // nombre de séries de travail du groupe pour la semaine
}

export interface MuscleGroupProgression {
  muscleGroup: MuscleGroup;
  weeks: WeeklyMuscleStatPoint[];
  currentChange: string; // variation formatée pour la semaine courante (ex. "+5,0\u00A0%")
  currentWorkSets: number; // séries work de la semaine courante (semaine 8)
}

// Calcul de la progression sur 8 semaines pour un groupe musculaire
export function calculateMuscleGroupProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
  muscleGroup: MuscleGroup;
}): MuscleGroupProgression;

// Calcul de la progression sur 8 semaines pour l'ensemble des 11 groupes musculaires
export function calculateAllMuscleGroupsProgression(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, MuscleGroupProgression>;
```

#### Fonctions minces de chargement Dexie (lecture seule, sans calcul métier)
Les fonctions `load...` chargent les données depuis Dexie sans filtrer (aucun calcul métier) :

```typescript
// Charge les séances et les séries associées pour un exercice
export async function loadExerciseStatsData(exerciseId: number): Promise<{
  sessions: Session[];
  sets: SetEntry[];
}>;

// Charge les séances, séries et exercices nécessaires pour une semaine donnée
export async function loadWeeklyStatsData(weekDate: string): Promise<{
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
}>;

// Charge les séances, séries et exercices nécessaires sur la période de 8 semaines
export async function loadGeneralStatsData(referenceDate: string): Promise<{
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
}>;
```

#### Hooks réactifs useLiveQuery (`src/db/stats.ts`)
```typescript
// Hook réactif pour la progression d'un exercice (vue Exercices)
export function useExerciseProgression(exerciseId: number | null):
  | { progression: ExerciseProgression | null }
  | undefined;

// Hook réactif pour la progression générale sur 8 semaines (vue Général)
export function useGeneralProgression(referenceDate?: string):
  | { progression: GeneralProgression }
  | undefined;

// Hook réactif pour la progression des 11 groupes musculaires (vue Muscles)
export function useMusclesProgression(referenceDate?: string):
  | { progression: Record<MuscleGroup, MuscleGroupProgression> }
  | undefined;
```

### 6.2 Lot 4d : Progression par exercice (`src/features/stats/`)
- Composant `LineChart` en SVG natif avec tokens Tailwind et repère record gold.
- Composant `StatsTab` avec choix de l'exercice et affichage de la courbe.
- Intégration de la prop `includeArchived?: boolean` dans `ExercisePicker` et `filterExercises`.
- Intégration de l'onglet `Progrès` dans `src/components/TabBar.tsx` et `src/App.tsx`.

### 6.3 Lot 4e : Vues Général et Muscles (`src/features/stats/`)
- Contrôle segmenté en haut de `StatsTab` : « Général | Muscles | Exercices », Général sélectionné par défaut.
- Vue Général : variation de la dernière semaine (`progression.currentChange`) et courbe sur 8 semaines via `LineChart` (`mode="index"`).
- Vue Muscles :
  - Grille des 11 groupes musculaires réutilisant `MuscleGroupGrid` avec la prop `subtitles` pour afficher l'indice sous chaque nom.
  - Détail d'un groupe au clic : bouton retour, icône, variation actuelle, séries de travail de la dernière semaine, courbe sur 8 semaines et historique hebdomadaire des séries.
- Mode `index` dans `LineChart` et `chartGeometry` avec bornes à $\pm 2{,}5\text{ points}$ en cas d'indice constant.
- Règle « Aucune séance » si aucune donnée disponible.
