# Spécification : Lot 2 — Groupes musculaires

Cette spécification définit l'évolution des groupes musculaires dans l'application, la migration de schéma et de données associée (Dexie v2 → v3), la nouvelle ergonomie en grille de la bibliothèque d'exercices, ainsi que les vérifications et tests prévus.

---

## 1. État actuel dans le code

### Type `MuscleGroup` et ses valeurs
- **Fichier** : [`src/db/schema.ts:3-12`](file:///d:/muscu-pwa/src/db/schema.ts#L3-L12)
- **Valeurs actuelles (6 groupes)** :
  ```ts
  export const MUSCLE_GROUPS = [
    'Pectoraux',
    'Dos',
    'Épaules',
    'Bras',
    'Jambes',
    'Abdominaux',
  ] as const;

  export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
  ```
- **Définition dans l'exercice** : [`src/db/schema.ts:27`](file:///d:/muscu-pwa/src/db/schema.ts#L27) (`muscleGroup: MuscleGroup`).

### Version Dexie actuelle et index
- **Fichier** : [`src/db/schema.ts:94-103`](file:///d:/muscu-pwa/src/db/schema.ts#L94-L103)
- **Version actuelle** : **Version 2** (`db.version(2)`).
- **Index actuels sur `exercises`** : `'++id, name'` ([`src/db/schema.ts:97`](file:///d:/muscu-pwa/src/db/schema.ts#L97)).
- **Index utilisant le groupe musculaire** : **Aucun index**. `muscleGroup` est une propriété non indexée de la table `exercises`.
- **Évolution en v3** : `exercises` conserve le schéma d'index `'++id, name'`. Aucun index n'est ajouté sur `muscleGroup`.

### `Record<MuscleGroup, …>` et tous les usages
1. **Dictionnaires `Record<MuscleGroup, …>`** :
   - [`src/components/MuscleGroupBadge.tsx:4-11`](file:///d:/muscu-pwa/src/components/MuscleGroupBadge.tsx#L4-L11) :
     ```ts
     export const MUSCLE_GROUP_MONOGRAMS: Record<MuscleGroup, string> = {
       Pectoraux: 'PE',
       Dos: 'DO',
       Épaules: 'ÉP',
       Bras: 'BR',
       Jambes: 'JA',
       Abdominaux: 'AB',
     };
     ```
   - [`src/db/exercises.ts:66-84`](file:///d:/muscu-pwa/src/db/exercises.ts#L66-L84) :
     `export async function getExercisesByGroup(): Promise<Record<MuscleGroup, Exercise[]>>` initialise un dictionnaire complet typé `Record<MuscleGroup, Exercise[]>`.

2. **Usages recensés** :
   - **Badges** :
     - [`src/components/MuscleGroupBadge.tsx:19-41`](file:///d:/muscu-pwa/src/components/MuscleGroupBadge.tsx#L19-L41) : composant affichant le monogramme à 2 caractères.
     - [`src/features/exercises/ExerciseCard.tsx:19`](file:///d:/muscu-pwa/src/features/exercises/ExerciseCard.tsx#L19) : badge dans la carte d'exercice de la bibliothèque.
     - [`src/features/session/ExerciseCard.tsx:181, 224`](file:///d:/muscu-pwa/src/features/session/ExerciseCard.tsx#L181-L224) : badge dans l'en-tête de la carte de séance (état fermé et état ouvert).
   - **Filtres et bibliothèque** :
     - [`src/features/exercises/ExerciseList.tsx:91-125`](file:///d:/muscu-pwa/src/features/exercises/ExerciseList.tsx#L91-L125) : boucle sur `MUSCLE_GROUPS.map((group) => ...)` pour afficher les sections par groupe.
   - **Seed initial (19 exercices)** :
     - [`src/db/exercises.ts:3-34`](file:///d:/muscu-pwa/src/db/exercises.ts#L3-L34) : `DEFAULT_EXERCISES` définit les 19 exercices par défaut.
   - **Modales et sélecteurs** :
     - [`src/features/exercises/ExerciseModal.tsx:21-23, 102-120`](file:///d:/muscu-pwa/src/features/exercises/ExerciseModal.tsx#L21-L23) : sélection du groupe par boutons/chips dans le formulaire de création/édition.
     - [`src/features/session/AddExerciseModal.tsx:110`](file:///d:/muscu-pwa/src/features/session/AddExerciseModal.tsx#L110) : affichage du libellé du groupe sous le nom de l'exercice lors de l'ajout en séance.
     - [`src/features/programs/ProgramDetail.tsx:346`](file:///d:/muscu-pwa/src/features/programs/ProgramDetail.tsx#L346) : affichage du libellé du groupe sous le nom de l'exercice lors de l'ajout à une séance type.

### Recopie du groupe ailleurs que dans l'exercice
- **Tables Dexie** : Aucune autre table (`programs`, `programExercises`, `sessions`, `sessionExercises`, `sets`) ne contient le champ `muscleGroup` ([`src/db/schema.ts:53-76`](file:///d:/muscu-pwa/src/db/schema.ts#L53-L76)).
- **Jointures à la volée** :
  - [`src/db/sessions.ts:86`](file:///d:/muscu-pwa/src/db/sessions.ts#L86) : `getSessionDetails` enrichit `SessionExercise` via `exercise?: Exercise` lu depuis `exercises.get(exerciseId)`.
  - [`src/features/programs/ProgramDetail.tsx`](file:///d:/muscu-pwa/src/features/programs/ProgramDetail.tsx) : résout les exercices depuis `exercises` pour l'affichage.
- **Constat** : Le groupe musculaire réside exclusivement dans l'enregistrement de l'exercice (`Exercise.muscleGroup`). Aucune autre table n'est modifiée lors de la migration.

---

## 2. Nouvelle liste des groupes musculaires et monogrammes

La nouvelle liste comprend 11 groupes musculaires. Conformément à la convention existante, les valeurs internes sont en français avec accents et majuscules.

| Groupe (valeur interne & libellé) | Monogramme (2 lettres) | Justification |
| :--- | :---: | :--- |
| `Pectoraux` | **PE** | Conservé de la v1 |
| `Dos` | **DO** | Conservé de la v1 |
| `Épaules` | **ÉP** | Conservé de la v1 |
| `Biceps` | **BI** | Dérivé de **Bi**ceps |
| `Triceps` | **TR** | Dérivé de **Tr**iceps |
| `Avant-bras` | **AV** | Dérivé de **Av**ant-bras |
| `Abdos` | **AB** | Remplace « Abdominaux », monogramme **AB** conservé |
| `Quadriceps` | **QU** | Dérivé de **Qu**adriceps |
| `Ischios` | **IS** | Dérivé de **Is**chios |
| `Fessiers` | **FE** | Dérivé de **Fe**ssiers |
| `Mollets` | **MO** | Dérivé de **Mo**llets |

Chaque monogramme est strictement unique (PE, DO, ÉP, BI, TR, AV, AB, QU, IS, FE, MO) et s'affiche dans les badges existants de 28×28 px.

### Seed d'une nouvelle installation (hors migration)
1. **Mise à jour de `DEFAULT_EXERCISES`** :
   - Pour toute nouvelle installation (`count === 0`), `DEFAULT_EXERCISES` dans [`src/db/exercises.ts`](file:///d:/muscu-pwa/src/db/exercises.ts) utilise directement les 11 nouveaux groupes musculaires (mêmes affectations que le tableau des 19 exercices).
   - Exercices ajoutés au seed pour couvrir les nouveaux groupes :
     - `extension mollet` (`muscleGroup: 'Mollets'`)
     - `tirage poulie avant bras` (`muscleGroup: 'Avant-bras'`)
     - Pour les Fessiers : couvert par les exercices existants ou ajout d'un exercice dédié lors d'un seed neuf si requis.
2. **Aucun doublon et règle stricte de non-injection** :
   - `seedExercisesIfNeeded()` n'insère les exercices que si la table est vide (`count === 0`).
   - Sur une base existante mise à niveau de v2 en v3, `count > 0` : le seed ne s'exécute pas.
   - La migration v3 n'ajoute **jamais** de données (aucun exercice de seed n'est injecté chez un utilisateur existant).
   - Aucun doublon n'est possible, que la base soit neuve ou migrée.

---

## 3. Migration Dexie (Version 2 → Version 3)

### Principes
1. **Intégrité absolue** : Aucun exercice, aucune séance, aucune série n'est supprimée. Tous les `id`, configurations (`weightStep`) et historiques restent strictement inchangés.
2. **Schéma v3** :
   ```ts
   db.version(3)
     .stores({
       exercises: '++id, name',
     })
     .upgrade(async (tx) => {
       // Migration des groupes musculaires
     });
   ```

### Migration figée et indépendante
Le code de l'upgrade v3 est strictement figé dans le temps et autonome :
- Il contient ses **propres définitions locales** :
  - Le type local `LegacyMuscleGroup` pour les anciennes valeurs :
    ```ts
    type LegacyMuscleGroup =
      | 'Pectoraux'
      | 'Dos'
      | 'Épaules'
      | 'Bras'
      | 'Jambes'
      | 'Abdominaux';
    ```
  - Le type local cible des 11 groupes.
  - La liste locale et ordonnée des mots-clés normalisés pour `Bras` et `Jambes`.
  - La fonction locale de normalisation des chaînes.
- **Règle absolue** : La migration **n'importe ni `MUSCLE_GROUPS`, ni aucune constante, type ou fonction métier de l'application**. Aucun `as any` n'est utilisé. Un futur changement de code ou de constantes ne pourra ainsi jamais altérer rétroactivement l'exécution de la migration v3.

### Algorithme de migration unique
Un seul et même algorithme s'applique à **tous les exercices** présents dans la base de données (exercices du seed initial comme exercices créés par l'utilisateur). Il n'y a aucune détection par nom pour le seed.

#### 1. Normalisation
Avant toute recherche de mots-clés, le nom de l'exercice ainsi que les mots-clés de référence sont normalisés :
- Passage en minuscules.
- Suppression de tous les accents et diacritiques via décomposition Unicode :
  `name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')`

#### 2. Règles de correspondance

- **Si `muscleGroup === 'Abdominaux'`** :
  Migré systématiquement vers **`Abdos`**.

- **Si `muscleGroup` vaut `'Pectoraux'`, `'Dos'` ou `'Épaules'`** :
  Conservé à l'identique vers **`Pectoraux`**, **`Dos`** ou **`Épaules`**.

- **Si `muscleGroup === 'Bras'`** :
  Ordre de priorité strict (le premier mot-clé trouvé dans le nom normalisé détermine le groupe) :
  1. **`Avant-bras`** si le nom contient l'un des termes normalisés :
     `'avant-bras'`, `'avant bras'`, `'poignet'`, `'wrist'`, `'pince'`, `'farmer'`, `'bobine'`
  2. **`Biceps`** si le nom contient l'un des termes normalisés :
     `'biceps'`, `'curl'`, `'marteau'`, `'pupitre'`, `'traction supination'`, `'larry scott'`
  3. **`Triceps`** si le nom contient l'un des termes normalisés :
     `'triceps'`, `'barre au front'`, `'extension'`, `'dips'`, `'pushdown'`, `'kickback'`, `'skull crusher'`, `'serre'`, `'corde'`
  - **Défaut `Bras`** : Si aucun mot-clé ne correspond, le groupe devient **`Biceps`**.

- **Si `muscleGroup === 'Jambes'`** :
  Ordre de priorité strict (le premier mot-clé trouvé dans le nom normalisé détermine le groupe) :
  1. **`Ischios`** si le nom contient l'un des termes normalisés :
     `'ischio'`, `'ischios'`, `'leg curl'`, `'romanian'`, `'roumain'`, `'rdl'`, `'souleve de terre jambes tendues'`, `'sdtjt'`, `'glute ham'`, `'nordic'`
  2. **`Mollets`** si le nom contient l'un des termes normalisés :
     `'mollet'`, `'mollets'`, `'calf'`, `'mollets debout'`, `'mollets assis'`, `'soleaire'`
  3. **`Fessiers`** si le nom contient l'un des termes normalisés :
     `'fessier'`, `'fessiers'`, `'glute'`, `'hip thrust'`, `'pont'`, `'kickback fessier'`, `'abduction'`, `'fente bulgare'`, `'abducteur'`
  4. **`Quadriceps`** si le nom contient l'un des termes normalisés :
     `'squat'`, `'quadriceps'`, `'quad'`, `'presse'`, `'leg extension'`, `'fente'`, `'hack'`, `'sissy'`, `'adducteur'`
  - **Défaut `Jambes`** : Si aucun mot-clé ne correspond, le groupe devient **`Quadriceps`**.

#### 3. Cas de test de validation sur les 19 exercices du seed v2
L'exécution de cet algorithme générique sur les 19 exercices du seed v2 produit le résultat attendu ci-dessous, qui sert de cas de test de référence :

| Exercice du seed v2 | Ancien groupe | Règle appliquée / Mot-clé détecté | Nouveau groupe v3 |
| :--- | :--- | :--- | :--- |
| **Développé couché** | Pectoraux | Conservation directe | **Pectoraux** |
| **Développé incliné haltères** | Pectoraux | Conservation directe | **Pectoraux** |
| **Écarté à la poulie** | Pectoraux | Conservation directe | **Pectoraux** |
| **Tractions** | Dos | Conservation directe | **Dos** |
| **Soulevé de terre** | Dos | Conservation directe | **Dos** |
| **Rowing barre** | Dos | Conservation directe | **Dos** |
| **Tirage vertical** | Dos | Conservation directe | **Dos** |
| **Développé militaire** | Épaules | Conservation directe | **Épaules** |
| **Élévations latérales** | Épaules | Conservation directe | **Épaules** |
| **Oiseau banc incliné** | Épaules | Conservation directe | **Épaules** |
| **Squat** | Jambes | Match `squat` (Quadriceps) | **Quadriceps** |
| **Presse à cuisses** | Jambes | Match `presse` (Quadriceps) | **Quadriceps** |
| **Fentes** | Jambes | Match `fente` (Quadriceps) | **Quadriceps** |
| **Leg curl** | Jambes | Match `leg curl` (Ischios) | **Ischios** |
| **Curl biceps barre** | Bras | Match `biceps` / `curl` (Biceps) | **Biceps** |
| **Dips** | Bras | Match `dips` (Triceps) | **Triceps** |
| **Barre au front** | Bras | Match `barre au front` (Triceps) | **Triceps** |
| **Crunch** | Abdominaux | Règle Abdominaux → Abdos | **Abdos** |
| **Gainage planche** | Abdominaux | Règle Abdominaux → Abdos | **Abdos** |

---

## 4. Bibliothèque d'exercices : Grille en 2 colonnes

### Vue principale (Grille des groupes)
- Remplacement de la liste continue actuelle par une **grille à 2 colonnes** (`grid grid-cols-2 gap-3`).
- Chaque carte de groupe est un élément interactif `<button type="button">` accessible (`role="button"`) contenant :
  1. Le **monogramme** dans un badge circulaire (ex. « PE »).
  2. Le **nom du groupe** en gras (ex. « Pectoraux »).
  3. Le **nombre d'exercices** associé : ex. « 3 exercices », « 1 exercice », ou « 0 exercice » (on écrit « exercices » et non « actifs »).
- **Groupes vides** : Les 11 groupes restent tous affichés en permanence, y compris ceux ayant 0 exercice.
- **Recherche** : Pas de barre de recherche dans l'écran de la bibliothèque (navigation directe par groupe).
- Bouton global « + Ajouter » présent dans l'en-tête de la bibliothèque pour créer un nouvel exercice.

### Vue détaillée (Liste d'un groupe musculaire)
- Un tap sur un `<button>` de groupe bascule l'affichage vers la liste des exercices appartenant à ce groupe.
- En-tête de la vue détaillée :
  - Bouton **« < Retour »** (`role="button"`, `aria-label="Retour"`) qui ramène à la vue grille.
  - Nom du groupe avec son monogramme et le nombre d'exercices.
  - Bouton **« + Ajouter »** qui ouvre la modale de création d'exercice avec ce groupe pré-sélectionné.
- Liste verticale des exercices du groupe via le composant existant `ExerciseCard` (actions modifier et supprimer avec dialogue de confirmation).
- Si le groupe est vide : affichage d'un état vide explicite (« Aucun exercice dans ce groupe ») avec un bouton pour en ajouter un.

### Modales d'ajout et d'édition d'exercices
- **Modales d'ajout (`AddExerciseModal` et `ProgramDetail`)** :
  - Unification via le composant partagé unique `ExercisePicker` (aucune logique de choix dupliquée).
  - La modale s'ouvre sur la grille des 11 groupes musculaires (composant partagé `MuscleGroupGrid`, identique à la bibliothèque), avec un champ de recherche au-dessus.
  - Les compteurs d'exercices par groupe excluent les exercices archivés et les exercices déjà présents dans la séance ou la séance type, et proviennent d'une fonction dédiée de `src/db/` (`getExerciseCountsByGroup`).
  - Dès qu'un texte est saisi dans le champ de recherche, la grille laisse place aux résultats de recherche portant sur tous les groupes, insensibles à la casse et aux accents (fonction `filterExercises` de `src/db/`).
  - Lorsque le champ de recherche est vidé, retour immédiat à la grille des groupes.
  - Toucher un groupe sur la grille affiche la liste de ses exercices avec un bouton « Retour » vers la grille.
  - À chaque réouverture de la modale : vue réinitialisée sur la grille, recherche vide, conteneur défilant remis en haut.
  - Aucun résultat de recherche ou groupe vide : affichage de la mention « Aucun exercice ».
  - Un seul bouton de fermeture (`aria-label="Fermer"`), aucun bouton en double.
  - Chaque ligne d'exercice est un bouton unique dont le nom accessible est le nom de l'exercice (aucun bouton imbriqué).
  - iOS : champ de saisie ≥ 16px, pas d'autoFocus, pas de texte d'aide.
- **`ExerciseModal`** (création / modification d'un exercice) : utilise le même composant de sélection qu'actuellement (grille de boutons/chips), adapté pour présenter les **11 groupes musculaires**.

---

## 5. Plan de tests

### Test de migration Dexie (`src/db/__tests__/migration-v3.test.ts`)
Un fichier de test dédié `src/db/__tests__/migration-v3.test.ts` valide sous fake-indexeddb :
1. **Initialisation en schéma v2** :
   - Insertion des 19 exercices du seed v2.
   - Insertion d'exercices personnalisés utilisateurs :
     - « Curl poignet » (`muscleGroup: 'Bras'`) → doit migrer en `Avant-bras` (priorité sur `curl`).
     - « Fente bulgare » (`muscleGroup: 'Jambes'`) → doit migrer en `Fessiers` (priorité sur `fente`).
     - « Glute ham » (`muscleGroup: 'Jambes'`) → doit migrer en `Ischios` (priorité sur `glute`).
     - « Mon exercice sans mot-clé » (`muscleGroup: 'Bras'`) → doit migrer en `Biceps` (défaut).
     - « Autre exercice mystère » (`muscleGroup: 'Jambes'`) → doit migrer en `Quadriceps` (défaut).
     - « Relevé de bassin » (`muscleGroup: 'Abdominaux'`) → doit migrer en `Abdos`.
     - Exercice du seed renommé par l'utilisateur : « Développé couché barre olympique » (`muscleGroup: 'Pectoraux'`) → reste `Pectoraux`.
   - Insertion d'une séance terminée avec des séries reliées à un exercice utilisateur.
2. **Exécution de l'upgrade Dexie vers v3** (`await db.open()`).
3. **Assertions strictes** :
   - `db.verno === 3`.
   - Vérification de la nouvelle valeur de `muscleGroup` pour chaque exercice ci-dessus.
   - Vérification que l'exercice relié à la séance conserve son `id`, ses `weightStep`, et que toutes ses séries associées (`SetEntry`) sont parfaitement intactes.

### Tests d'interface Testing Library (`src/features/exercises/__tests__/ExerciseList.test.tsx`)
Tests réalisés par requêtes de rôle (`getByRole`, `getAllByRole`) sans assertion sur les classes CSS :
1. **Affichage de la grille des 11 groupes** :
   - Vérifie la présence des 11 boutons `<button>` correspondant aux 11 groupes musculaires (`getByRole('button', { name: /pectoraux/i })`, etc.).
   - Vérifie que les groupes sans exercice affichent bien « 0 exercice ».
2. **Navigation vers un groupe et retour** :
   - Clic sur le bouton du groupe « Pectoraux ».
   - Vérifie l'affichage des exercices du groupe (ex. « Développé couché »).
   - Clic sur le bouton « < Retour » (`getByRole('button', { name: /retour/i })`).
   - Vérifie le retour immédiat sur la grille des 11 groupes.
3. **Pré-sélection du groupe à l'ajout** :
   - Navigation dans le groupe « Biceps », clic sur « + Ajouter ».
   - Vérifie que la modale s'ouvre avec le chip « Biceps » activé par défaut.

---

## 6. Tests existants à mettre à jour

La suppression des anciens groupes (`'Bras'`, `'Jambes'`, `'Abdominaux'`) et l'introduction de la grille nécessiteront d'adapter les tests suivants :

1. **[`src/db/__tests__/exercises.test.ts`](file:///d:/muscu-pwa/src/db/__tests__/exercises.test.ts)** :
   - Remplacer les valeurs `'Bras'` et `'Jambes'` par les nouveaux groupes (ex. `'Biceps'`, `'Quadriceps'`).
   - Ligne 79 : `expect(grouped.Jambes)` à adapter avec les nouveaux groupes (`grouped.Quadriceps`, etc.).
2. **[`src/features/exercises/__tests__/ExerciseList.test.tsx`](file:///d:/muscu-pwa/src/features/exercises/__tests__/ExerciseList.test.tsx)** :
   - Ligne 47 : `screen.getByRole('button', { name: 'Jambes' })` remplacé par un groupe valide (ex. `'Quadriceps'`).
   - Lignes 125-127 : assertion sur le monogramme `'JA'` à mettre à jour avec les nouveaux monogrammes (`'QU'`, etc.).
   - Remplacement du test de liste continue par les tests de grille et de navigation détaillée.
3. **[`src/features/session/__tests__/SeanceTab.test.tsx`](file:///d:/muscu-pwa/src/features/session/__tests__/SeanceTab.test.tsx)** :
   - Remplacer les créations d'exercices fictifs utilisant `'Bras'`, `'Jambes'`, `'Abdominaux'` (ex. l. 107, 226, 244, 351, 438, 645, 730, 731, 773, 819, 851, 886, 887, 929, 995, 996) par des groupes de la nouvelle liste (`'Biceps'`, `'Triceps'`, `'Quadriceps'`, `'Abdos'`).
4. **[`src/features/programs/__tests__/ProgramDetail.test.tsx`](file:///d:/muscu-pwa/src/features/programs/__tests__/ProgramDetail.test.tsx)** :
   - Ligne 21 : remplacer `muscleGroup: 'Jambes'` par `muscleGroup: 'Quadriceps'`.
5. **[`src/db/__tests__/programs.test.ts`](file:///d:/muscu-pwa/src/db/__tests__/programs.test.ts)** :
   - Ligne 181 : remplacer `muscleGroup: 'Bras'` par `muscleGroup: 'Biceps'`.
6. **[`src/db/__tests__/sessions.test.ts`](file:///d:/muscu-pwa/src/db/__tests__/sessions.test.ts)** :
   - Remplacer les occurrences de `'Bras'` et `'Jambes'` (l. 134, 185-187, 205, 270, 318, 330, 383, 395, 408, 592-594, 675) par des groupes valides.
7. **[`src/db/__tests__/suggestions.test.ts`](file:///d:/muscu-pwa/src/db/__tests__/suggestions.test.ts)** :
   - Remplacer les occurrences de `'Bras'` et `'Jambes'` (l. 110, 197, 218, 276, 283, 295, 343) par des groupes valides.

---

## 7. Liste de vérifications sur iPhone

Ces vérifications manuelles sur iPhone (safari / PWA installée, viewport 390×844) devront être validées lors de l'implémentation de l'interface :
- [ ] **Zones tactiles** : Chaque tuile `<button>` de la grille et chaque bouton de navigation mesure au moins 44×44 px.
- [ ] **Mise en page et défilement** : Hauteur de l'en-tête compensée par `var(--header-height)` et barre d'onglets par `var(--tabbar-height)`.
- [ ] **Bouton retour** : Accessible d'une main, avec retour fluide sans saut de défilement.
- [ ] **Sélection dans `ExerciseModal`** : Les 11 boutons de sélection de groupe s'affichent correctement sans dépasser de l'écran, utilisables facilement avec le clavier virtuel ouvert ou fermé.
- [ ] **Séance libre (ajout d'exercice)** : L'exercice ajouté se place comme avant (fin de liste si aucune série, sinon avant le premier exercice non terminé).
- [ ] **Séance type (ajout d'exercice)** : L'exercice ajouté a 1 série d'échauffement et 3 de travail.
- [ ] **Exercice déjà présent** : N'apparaît ni dans la liste ni dans le compteur de son groupe.
