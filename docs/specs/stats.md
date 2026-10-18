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
| `Exercise` | `muscleGroup` | `src/db/schema.ts:33` | Groupe musculaire parmi les 11 groupes pour le volume hebdomadaire |

---

## 2. Règles métier

### 2.1 Séries de travail uniquement
Les fonctions de calcul qui reçoivent des séries filtrent elles-mêmes `type === 'work'`. L'appelant n'a aucun préfiltrage à effectuer.
Les séries d'échauffement (`type === 'warmup'`) sont strictement ignorées dans l'ensemble des statistiques (poids moyen, volume, record personnel, séries hebdomadaires).

*Exemple chiffré :*
- 1 série d'échauffement : 40 kg × 10 reps (`type: 'warmup'`)
- 2 séries de travail : 80 kg × 10 reps (`type: 'work'`), 85 kg × 8 reps (`type: 'work'`)
- Seules les séries de 80 kg et 85 kg sont prises en compte ; la série à 40 kg est ignorée.

### 2.2 Séances terminées uniquement
Toute séance sans date de fin (`endedAt === undefined` ou non renseigné) est une séance en cours ou abandonnée. Elle est strictement exclue de tous les calculs (courbe de progression, record personnel, volume et décompte des séries hebdomadaires).
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
  - Volume : $(20 \times 8) + (18 \times 10) = 160 + 180 = 340\text{ kg}$
  - Répétitions : $8 + 10 = 18\text{ reps}$
  - Calcul exact : $340 / 18 \approx 18{,}8888\dots\text{ kg}$
  - **Chaîne attendue : `'19\u00A0kg'`**
- **Exemple b** : 80 kg × 10 reps, 85 kg × 8 reps, 85 kg × 7 reps
  - Volume : $(80 \times 10) + (85 \times 8) + (85 \times 7) = 800 + 680 + 595 = 2075\text{ kg}$
  - Répétitions : $10 + 8 + 7 = 25\text{ reps}$
  - Calcul exact : $2075 / 25 = 83{,}00\text{ kg}$
  - **Chaîne attendue : `'83\u00A0kg'`**
- **Exemple c** : 20 kg × 8 reps, 18 kg × 14 reps
  - Volume : $(20 \times 8) + (18 \times 14) = 160 + 252 = 412\text{ kg}$
  - Répétitions : $8 + 14 = 22\text{ reps}$
  - Calcul exact : $412 / 22 \approx 18{,}7272\dots\text{ kg}$
  - **Chaîne attendue : `'18,5\u00A0kg'`**

### 2.4 Volume par séance et impact des répétitions sur séries légères
Le volume d'un exercice pour une séance terminée est la somme :

$$\text{Volume} = \sum (\text{poids} \times \text{reps})$$

sur les séries `'work'` de cet exercice dans la séance.

- **Séparateur des milliers et unité** : encodé avec le caractère espace insécable `\u00A0` (Unicode NO-BREAK SPACE, U+00A0).
  - Chaîne attendue en test : `'2\u00A0075\u00A0kg'`.
- **Comportement documenté (Exemple c comparé à l'exemple a)** :
  - Ajouter des répétitions sur une série plus légère augmente le volume total mais abaisse mathématiquement le poids moyen par rep (le dénominateur des répétitions augmente proportionnellement plus que le numérateur).
  - *Exemple chiffré :*
    - Séance 1 (Exemple a) : 20×8 et 18×10 $\rightarrow$ Poids moyen = `'19\u00A0kg'`, Volume = `'340\u00A0kg'`.
    - Séance 2 (Exemple c) : 20×8 et 18×14 $\rightarrow$ Poids moyen = `'18,5\u00A0kg'`, Volume = `'412\u00A0kg'`.
    - Le volume affiché à côté de la courbe passe de 340 kg à 412 kg (+72 kg), attestant du progrès accompli malgré la baisse apparente de la moyenne.

### 2.5 Séries allégées en fin de séance (« back-off »)
Une série allégée en fin d'exercice (back-off) pour accumuler du volume reste une série de travail normale (`type: 'work'`). Aucun nouveau type de série n'est introduit dans le schéma. Elle est incluse dans le calcul du poids moyen et du volume de la séance.

*Exemple chiffré :*
- 3 séries lourdes : 100 kg × 5 reps, 100 kg × 5 reps, 100 kg × 5 reps
- 1 série back-off : 70 kg × 12 reps
- Somme volume : $(100 \times 5 \times 3) + (70 \times 12) = 1500 + 840 = 2340\text{ kg}$
- Somme répétitions : $15 + 12 = 27\text{ reps}$
- Poids moyen exact : $2340 / 27 \approx 86{,}666\dots\text{ kg}$ $\rightarrow$ **Chaîne attendue : `'86,5\u00A0kg'`**
- Volume : **Chaîne attendue : `'2\u00A0340\u00A0kg'`**

### 2.6 Record personnel de l'exercice
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

### 2.7 Séries de travail par groupe et par semaine
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

### 2.8 Indice général de progression en poids (8 semaines)
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

### 2.9 Statistiques musculaires de la semaine de référence
Pour la semaine calendaire de `referenceDate` ('YYYY-MM-DD'), calcul pour chacun des 11 groupes musculaires de `MUSCLE_GROUPS` :
- `workSets` : nombre de séries de travail (`type === 'work'`) des séances terminées de la semaine ;
- `volume` : volume total soulevé ($\sum \text{poids} \times \text{reps}$) des séries de travail des séances terminées de la semaine.
- Renvoie **exactement 11 clés**. Tout groupe sans série vaut `{ workSets: 0, volume: 0 }`. Les exercices introuvables ou dont le groupe n'est pas dans `MUSCLE_GROUPS` sont ignorés.

*Exemple chiffré :*
- Semaine du 12/10/2026 au 18/10/2026 (`referenceDate: '2026-10-15'`) :
  - Développé couché (Pectoraux) : 3 séries de 80 kg × 10 reps = 2400 kg.
  - Barre au front (Triceps) : 3 séries de 30 kg × 10 reps = 900 kg.
- Résultat :
  - `Pectoraux` : `{ workSets: 3, volume: 2400 }`
  - `Triceps` : `{ workSets: 3, volume: 900 }`
  - Les 9 autres groupes : `{ workSets: 0, volume: 0 }` chacun.

### 2.10 Historique musculaire sur 8 semaines pour un groupe
Pour un groupe musculaire donné (`muscleGroup: MuscleGroup`), fournit les séries de travail et le volume pour chacune des 8 semaines consécutives se terminant par celle de `referenceDate`.
- Renvoie un tableau de 8 éléments ordonnés chronologiquement du plus ancien au plus récent.
- Chaque élément contient : `weekStart` ('YYYY-MM-DD', lundi), `weekEnd` ('YYYY-MM-DD', dimanche), `workSets` (nombre de séries de travail des séances terminées), `volume` (somme poids × reps).
- Les semaines sans entraînement pour ce groupe ont `workSets: 0` et `volume: 0`.

*Exemple chiffré :*
- Groupe ciblé : `Pectoraux`.
- Sur les 8 semaines se terminant le 18/10/2026 :
  - Semaine du 12/10/2026 au 18/10/2026 (semaine 8) : 7 séries de travail, volume 4475 kg.
  - Semaines 1 à 7 : 0 série, volume 0 kg si aucune séance pectoraux.
- Le tableau renvoyé compte exactement 8 points hebdomadaires.

### 2.11 Formatage de la variation d'indice (`formatIndexChange`)
L'affichage de la variation de l'indice général compare la valeur de l'indice à 100 :
$$\text{Écart} = \text{Indice} - 100$$
- **Règles strictes** :
  - Formatage manuel sans `Intl` ni `toLocaleString`.
  - Arrondi à 1 décimale avec virgule `,`.
  - Espace insécable `\u00A0` avant le symbole `%`.
  - Si l'écart est strictement positif : préfixé du signe `+` (ex. `« +5,8 % »` $\rightarrow$ `'+5,8\u00A0%'`).
  - Si l'écart est strictement négatif : préfixé du véritable signe moins Unicode `\u2212` (ex. `« −2,0 % »` $\rightarrow$ `'−2,0\u00A0%'`).
  - Si l'écart arrondi est nul : affiché `'0,0\u00A0%'` sans signe.
  - Si l'indice est `null` (aucun exercice fait) : affiché `'—'` (U+2014).

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
| **Exercice à 0 kg uniquement (poids du corps strict)** | Toutes les séries de toutes les séances sont à 0 kg. La courbe bascule en mode `'reps'`. | Séries : 0 kg × 10, 0 kg × 8, 0 kg × 7 $\rightarrow$ Courbe affiche **25 reps**, Record : `'Record\u00A0:\u00A00\u00A0kg\u00A0\u00D7\u00A010'`, Volume : `'0\u00A0kg'`. |
| **Total de répétitions = 0** | **Aucune division par zéro**. Si $\sum reps = 0$ ou aucune série `'work'`, la fonction renvoie `null`. | Séance sans répétition valide $\rightarrow$ renvoie `null`, tiret `« — »` affiché, aucun point sur la courbe. |
| **Séance en cours** | Exclue car `endedAt` est absent ou indéfini. | Voir section 2.2. |
| **Exercice archivé** | Dans `src/db/exercises.ts:143`, `filterExercises` exclut par défaut les archivés (`if (ex.archived) return false;`). `ExercisePicker` (`src/components/ExercisePicker.tsx:39`) les masque donc actuellement. La spec ajoute une prop optionnelle `includeArchived?: boolean` (défaut `false`, comportement actuel inchangé) à `ExercisePicker` et `filterExercises` pour permettre de consulter les statistiques d'un exercice archivé. | L'exercice archivé sélectionné affiche ses statistiques complètes sans section « Archivés » dédiée. |
| **Séance sans série pour l'exercice** | Aucun point tracé pour cette séance sur la courbe de l'exercice. | La séance n'a pas inclus cet exercice $\rightarrow$ ignorée sur sa courbe. |
| **Valeur constante ou séance unique ($min = max = V$)** | L'axe vertical Y est borné de $[V - 2{,}5\text{ kg} ; V + 2{,}5\text{ kg}]$. Le point est centré verticalement. | 1 séance à 60 kg $\rightarrow$ Axe Y va de 57,5 kg à 62,5 kg. Le point à 60 kg est tracé au milieu. |
| **Étendue temporelle (v1)** | L'intégralité des séances terminées de l'exercice est affichée chronologiquement, sans pagination ni défilement horizontal. | 15 séances sur un an $\rightarrow$ 15 points répartis sur toute la largeur du graphique. |

---

## 4. Interface utilisateur : 4e onglet « Progrès »

### 4.1 Intégration dans la barre de navigation
- Disposition actuelle dans `src/components/TabBar.tsx:36` :
  ```tsx
  <div className="max-w-md mx-auto grid grid-cols-3 px-2 h-[var(--tabbar-height)] items-center">
  ```
- Passage à 4 colonnes (`grid-cols-4`) pour accueillir le 4e onglet :
  ```tsx
  <div className="max-w-md mx-auto grid grid-cols-4 px-2 h-[var(--tabbar-height)] items-center">
  ```
- **Caractéristiques de l'onglet :**
  - Identifiant : `'progress'`
  - Libellé : `Progrès`
  - Icône : `TrendingUp` de `lucide-react` (taille 24px, `strokeWidth={2}`, `aria-hidden="true"`).
- **Maintien dans `--tabbar-height` (4rem / 64px) et calculs de largeur :**
  - Sur un écran mobile iPhone standard de 375 px de largeur :
    - Le conteneur applique `px-2` ($2 \times 8\text{px} = 16\text{px}$ de marge interne totale).
    - Largeur nette disponible : $375\text{px} - 16\text{px} = 359\text{px}$.
    - Largeur réelle par colonne : $\frac{359\text{px}}{4} = 89{,}75\text{px}$.
    - Le libellé le plus long de la barre est « Séances types » (13 caractères). Il tient dans les ~90 px avec la typographie `text-xs leading-tight`.
    - Le libellé « Progrès » (7 caractères) y tient très largement sans retour à la ligne.
    - **Contrainte de vérification lot 4c** : La capture d'écran requise pour valider l'interface devra obligatoirement montrer la barre d'onglets sur un viewport de 375 px de largeur afin de confirmer l'absence de chevauchement.
  - La zone tactile respecte $\ge 48\text{px}$ de hauteur et $\ge 44\text{px}$ de largeur.
  - La hauteur reste strictement fixée par `var(--tabbar-height)` avec `pb-[env(safe-area-inset-bottom)]`.

### 4.2 Vues de l'onglet Progrès
- **Vue 1 : Progression par exercice**
  - Sélecteur d'exercice : réutilise le composant existant `ExercisePicker` avec la prop `includeArchived={true}`.
  - Cartouche de métriques :
    - Poids moyen de la dernière séance terminée (ex. `'83\u00A0kg'`).
    - Volume total de la dernière séance (ex. `'2\u00A0075\u00A0kg'`).
    - Record personnel de l'exercice (ex. `'Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08'`).
  - Graphique : courbe temporelle du poids moyen (ou des reps si 0 kg) avec point gold marquant le record personnel.
- **Vue 2 : Séries par groupe et par semaine**
  - Sélecteur de semaine (chaîne `'YYYY-MM-DD'` explicite).
  - Décompte des séries de travail pour les 11 groupes musculaires, chacun accompagné de son composant `MuscleIcon`.

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
Les fonctions qui ne reçoivent que des séries (`calculateAverageWeight`, `calculateSessionVolume`, `calculateSessionReps`, `findPersonalRecord`) filtrent uniquement `type === 'work'`.
Le filtrage des séances terminées (`endedAt !== undefined`) est opéré uniquement dans les fonctions qui reçoivent le tableau `sessions` (`buildExerciseProgression` et `calculateWeeklyWorkSetsByGroup`).
Toutes les dates manipulées sont des chaînes au format `'YYYY-MM-DD'` (aucun objet `Date`) :

```typescript
// Poids moyen par rep pour une séance (renvoie null si sum(reps) === 0 ou pas de série work)
export function calculateAverageWeight(sets: SetEntry[]): number | null;

// Volume total (somme de poids × reps) des séries work
export function calculateSessionVolume(sets: SetEntry[]): number;

// Total de répétitions des séries work (pour le mode 0 kg poids du corps)
export function calculateSessionReps(sets: SetEntry[]): number;

// Série record selon les 3 critères de départage (poids max, reps max, ancienneté)
export function findPersonalRecord(sets: SetEntry[]): SetEntry | null;

// Formatage du poids (arrondi 0,5 kg le plus proche) : ex. "19\u00A0kg", "18,5\u00A0kg"
export function formatStatWeight(weight: number): string;

// Formatage du volume (séparateur des milliers \u00A0) : ex. "2\u00A0075\u00A0kg"
export function formatStatVolume(volume: number): string;

// Formatage du record personnel : ex. "Record\u00A0:\u00A085\u00A0kg\u00A0\u00D7\u00A08"
export function formatPersonalRecord(record: SetEntry): string;

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
  volume: number;
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
  volume: number;
}

export function calculateWeeklyMuscleStats(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
}): Record<MuscleGroup, MuscleGroupWeeklyStat>;

// Historique hebdomadaire sur 8 semaines pour un groupe musculaire
export interface WeeklyMuscleGroupHistoryPoint {
  weekStart: string; // 'YYYY-MM-DD'
  weekEnd: string;   // 'YYYY-MM-DD'
  workSets: number;
  volume: number;
}

export function calculateMuscleGroupHistory(params: {
  sessions: Session[];
  sets: SetEntry[];
  exercises: Exercise[];
  referenceDate: string;
  muscleGroup: MuscleGroup;
}): WeeklyMuscleGroupHistoryPoint[];
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

### 6.2 Lot 4d : Interface utilisateur (`src/features/stats/`)
- Composant `LineChart` en SVG natif avec tokens Tailwind et repère record gold.
- Composant `StatsTab` gérant la bascule entre la vue Exercice, la vue Générale et la vue Hebdomadaire par groupe.
- Intégration de la prop `includeArchived?: boolean` dans `ExercisePicker` et `filterExercises`.
- Intégration de l'onglet `Progrès` dans `src/components/TabBar.tsx` et `src/App.tsx`.
