# Muscu PWA
PWA de suivi de musculation (séances, exercices, séries, reps, poids).
Usage : iPhone iOS 18, installée sur l'écran d'accueil, hors-ligne à la salle.

## Stack
Vite + React + TypeScript (strict), Tailwind CSS v4, Dexie (IndexedDB),
vite-plugin-pwa, Vitest + Testing Library, ESLint.

## Commandes
- `npm run dev` : serveur de dev
- `npm run lint` / `npm test` / `npm run build` : vérifications

## Interface mobile
- La meta viewport contient `viewport-fit=cover` ; tout élément fixé en bas utilise `env(safe-area-inset-bottom)`.
- Tests d'interface : requêtes par rôle ou libellé (getByRole, getByLabelText). Pas de test sur les classes CSS.
- Une tâche d'interface ne modifie pas `src/db/`. Un besoin manquant est signalé dans le plan, pas implémenté.

## Architecture
- Les composants n'importent jamais l'objet `db`. Ils importent les fonctions exportées par `src/db/` (y compris les utilitaires comme toWeekday) ; ne jamais recopier une fonction existante.
- Aucun commit avec des tests en échec.


## Conventions de tests
- Les tests sont dans un dossier `__tests__/` à côté du code testé (ex. `src/__tests__/` pour `src/App.tsx`).

## Design
- docs/specs/design.md fait foi. Couleurs uniquement via les tokens @theme : aucune couleur codée en dur, jamais de violet/indigo ni de dégradé.
- Une tâche de style ne modifie ni la logique, ni src/db/, ni les tests.

## Vocabulaire
- Interface : « séance type » (jamais « programme »). Code : Program / programs. Ne pas renommer le code pour suivre l'interface.

## État et dates
- L'état d'une séance vit dans Dexie (useLiveQuery), jamais uniquement en mémoire React : l'app doit survivre à une fermeture par iOS.
- Les tests qui dépendent de la date ou de l'heure la fixent avec vi.useFakeTimers / vi.setSystemTime.
- Jour de la semaine : toujours via toWeekday (1 = lundi … 7 = dimanche), jamais getDay() directement.

## Réutilisation
- Avant de planifier, lister les fonctions exportées de src/db/ (Select-String -Pattern "^export") et réutiliser l'existant. Ne jamais réimplémenter une logique déjà présente.

## Actions irréversibles
- Terminer une séance, supprimer une donnée : toujours un dialogue de confirmation (role="alertdialog").

## Saisie
- Champs numériques : input type="text" inputMode="decimal", validés par parseWeight/parseReps. Jamais type="number" ni parseFloat dans un composant.
- Aucun calcul métier (poids, pas, arrondi, choix de référence) dans les composants : uniquement via src/db/.

## Séance en cours
- Les actions sur une séance (ajouter, retirer, passer, réordonner) ne modifient jamais la séance type.
- Un exercice ne peut apparaître qu'une fois par séance et par séance type (le poids de référence en dépend).

## iOS
- Champs de saisie : texte ≥ 16px, jamais d'autoFocus. Ne jamais bloquer le zoom (pas de maximum-scale / user-scalable=no).
- Les plans signalent explicitement ce qui ne peut être vérifié que sur iPhone.

## Mise en page iOS
- L'en-tête et la barre de navigation sont en position fixed, jamais sticky. L'en-tête inclut safe-area-inset-top, la barre de navigation safe-area-inset-bottom.
- Le contenu compense leurs hauteurs avec une méthode unique (variable CSS), jamais un chiffre recopié écran par écran.
- html et body ont le fond du token bg et overscroll-behavior: none.
- Barres de défilement masquées sur html, body et tout conteneur qui défile.
- Toute liste qui défile automatiquement vers un élément prévoit un espace en bas pour que le dernier élément puisse atteindre la position voulue.

## Bugs d'affichage
- Les tests jsdom ne voient pas la mise en page : citer la cause dans le code (fichier:ligne) avant de corriger.
- Finir le plan par une liste de vérifications à faire sur iPhone.

## Diagnostic
- Si la cause d'un bug n'est pas trouvée, écrire "cause non trouvée". Ne jamais présenter une hypothèse comme une cause.
- Ne pas répéter une règle CSS qui existe déjà : si elle ne marche pas, la cause est ailleurs.

## Mise en page iOS
- Aucun ancêtre d'un élément fixed ne porte transform, filter, backdrop-filter, will-change ou une animation.
- Les hauteurs de l'en-tête et de la barre de navigation viennent uniquement de var(--header-height) et var(--tabbar-height), jamais d'une classe comme h-16.
- Les espaces ajoutés pour le défilement sont calculés au plus juste, jamais égaux à une hauteur d'écran par défaut.
- Tester chaque correction de mise en page avec le clavier ouvert.
- Aucun élément fixed (dialog, menu, modale) n'est rendu à l'intérieur d'un élément qui a backdrop-blur, transform ou filter.
- html a min-height: calc(100% + env(safe-area-inset-top)) : contournement du bug iOS en PWA installée (barre fixed qui ne touche pas le bas). Ne pas retirer.
- Pour un défilement qui dépend d'un changement de taille, appliquer la taille sur le DOM (ref) avant d'appeler scrollTo, jamais via un state React dans la même image.

## Diagnostic
- Si la cause n'est pas dans le code, chercher un bug connu du navigateur avant de proposer une correction.

## Fenêtres superposées
- Toute confirmation passe par le composant partagé ConfirmDialog (Portal + overlay centré). Jamais de markup d'alertdialog recopié.
- Toute modale est rendue via Portal.
- Les z-index viennent uniquement de l'échelle définie dans index.css : header < nav < bouton + < modale < confirmation.
- Pas de variante sm: pour la mise en page mobile : l'app vise l'iPhone, la classe de base est celle qui s'applique.

## Prompts
- Un élément cité en exemple n'est pas une demande de modification : ne changer que ce qui est explicitement demandé.

## Migrations
- Les correspondances par mots-clés ont un ordre de priorité écrit ; les mots-clés et les noms sont normalisés (minuscules, sans accents).
- Un seul algorithme de migration pour toutes les données, seed compris : pas de cas spécial par nom.
- Les anciennes valeurs ont leur propre type (Legacy…) dans la migration ; jamais de as any.
- Une migration n'ajoute jamais de données (pas de seed injecté chez un utilisateur existant).
- Le code d'une migration est autonome et figé : il contient ses propres copies des valeurs et des tables de correspondance, et n'importe aucune constante de l'app.
- Tout le code de migration s'exécute dans l'upgrade Dexie : une erreur annule tout et laisse la base dans sa version précédente.
- Une valeur inconnue n'est jamais modifiée par une migration.
- La mise à jour des tests existants pour une migration change seulement les valeurs de données, jamais ce que le test vérifie.
- Chaque migration vit dans son propre fichier src/db/migrations/vN-*.ts.
- Une migration traite aussi les données archivées.
- Le test de migration vérifie que le nombre d'enregistrements de chaque table est le même avant et après.

## Interface
- Pas de texte d'aide ni de sous-titre sans demande explicite. Pas de bouton en double pour la même action sur un écran.
- Un élément cliquable contient au plus un bouton : jamais de bouton dans un bouton. Une ligne de liste sélectionnable est un seul <button>.
- Une liste vide affiche "Aucun exercice" (ou équivalent), sans texte d'aide.

## Commits
- Une tâche qui touche la base et l'interface fait au moins deux commits : d'abord la base et sa migration, puis l'interface.

## Périmètre
- Une demande nouvelle pendant une tâche n'est pas ajoutée au plan en cours : elle fait l'objet d'une tâche suivante, avec mise à jour de la spec.
- Une nouvelle fonction n'est utilisée que là où la tâche le demande. Remplacer un comportement existant (ex. détection des doublons) est une tâche à part.

## Composants
- Une même interface utilisée à deux endroits (ex. choix d'un exercice en séance libre et en séance type) est un seul composant partagé, jamais deux copies.
- Avant de fusionner deux copies d'une interface, citer leurs différences de comportement et demander lesquelles garder.

## Logique
- Toute recherche ou tout filtrage de données est une fonction de src/db/, testée. La normalisation de texte (casse, accents) est une seule fonction partagée, sauf dans les migrations, qui gardent leur propre copie.

## Installation iOS et sauvegarde
- iOS ne met jamais à jour le manifeste (nom, icônes, start_url) après l'installation : tout changement exige de réinstaller la PWA.
- Supprimer la PWA efface IndexedDB et localStorage : toute tâche qui exige une réinstallation commence par un export, vérifié par un import dans un autre navigateur.
- Logique de sauvegarde uniquement dans src/db/backup.ts.
- L'export couvre tout db.tables, jamais une liste écrite à la main ; un test échoue si une table manque.
- Toute modification du schéma Dexie met à jour la sauvegarde et son test aller-retour.
- Import : validation complète avant toute écriture, une seule transaction, remplacement total, ids conservés.
- Export de fichier : navigator.share({ files }) si canShare, sinon <a download> avec une URL de Blob ; jamais de data: URI.

## Tests
- Un test d'aller-retour passe par le même chemin que l'utilisateur (sérialisation comprise).
- Un test garde-fou compare à une valeur écrite dans le test, jamais au code testé lui-même.
- Un test avec un espion vérifie que l'espion a été appelé.
- Toute affirmation d'un plan (« ne peut pas arriver », « contient nécessairement ») est prouvée par un test.

## Erreurs
- Aucun commentaire « gestion d'erreur éventuelle » : chaque erreur est soit ignorée avec sa raison écrite (ex. AbortError), soit affichée à l'utilisateur.
- Toute future clé localStorage est ajoutée à la sauvegarde ou listée comme exclue avec sa raison.

## Validation des tâches
- Une tâche n'est terminée qu'avec : verify -> 0, commits attendus visibles dans git log, test iPhone fait.
- Ne jamais enchaîner une nouvelle tâche si la précédente n'a pas été validée sur l'iPhone.
- Sauvegarde : validée seulement après un import réussi dans un autre navigateur, avec des données identiques à celles de l'iPhone.

## État du projet
- Statut : PRÉPRODUCTION. Aucune donnée réelle, réinstaller la PWA est sans risque.
- Les migrations et la sauvegarde restent rigoureuses : elles serviront en production.
- À la mise en production, remplacer ce bloc par : « PRODUCTION, données réelles : export obligatoire avant toute réinstallation ».

## Icônes
- Navigation : lucide-react uniquement, imports nommés, aria-hidden, couleurs via les tokens.
- Groupes musculaires : uniquement src/components/MuscleIcon.tsx, Record<MuscleGroup, ...>.
- Toute icône dessinée par l'IA est validée visuellement sur l'iPhone avant d'être considérée comme terminée.

## Dépendances
- Toute nouvelle dépendance est nommée dans le prompt. Le plan cite sa version et l'impact sur la taille du bundle.

## Skills et modèles
- Skills du projet dans .agents/skills/. Tout skill externe est lu (SKILL.md et scripts) avant d'être installé.
- Toute production visuelle (SVG, icône, graphique) passe par une capture dans le navigateur de l'agent, analysée et jointe au walkthrough.
- Le modèle est choisi avant d'envoyer le prompt : Opus pour le visuel et les plans complexes, Flash pour les petites tâches.

## Plans
- Toute taille, durée ou performance citée est mesurée, jamais estimée.
- Un test supprimé est remplacé par un test équivalent sur le nouveau comportement.
- Quand un skill est utilisé, le plan vérifie chacune de ses contraintes, une par une.

## Images
- Originaux dans design/, versions générées dans src/assets/ par un script commité dans scripts/.
- Icônes multicolores : recolorées aux couleurs des tokens par script, jamais à la main.
- Taille du fichier = taille affichée × 3.
- Toute transformation d'image commence par mesurer les couleurs et les poids réels.
- Tout rendu visuel nouveau : capture d'aperçu et validation de l'utilisateur avant l'intégration.

## Groupes musculaires
- Partout dans l'interface, un groupe est représenté par MuscleIcon (PNG recolorés), jamais par une abréviation.
- Taille minimale : 40 px, et 48 px au maximum (fichiers en 144 px).

## Sauvegarde
- Logique dans src/db/backup.ts, testée, sans interface pour l'instant.
- Ne pas supprimer backup.ts ni ses tests.

## Groupes musculaires
- Une ligne d'exercice affiche MuscleIcon seulement si la liste mélange plusieurs groupes.

## Statistiques
- Règles uniquement dans docs/specs/stats.md, logique uniquement dans src/db/stats.ts (fonctions pures).
- Métrique principale : poids moyen par rep = somme(poids × reps) / somme(reps), séries de travail uniquement. Pas d'Epley.
- Record = série au poids max (égalité : plus de reps, puis la plus ancienne).
- Arrondi à 0,5 kg uniquement à l'affichage. Échauffement jamais compté. Aucune division par zéro.
- Chaque exemple chiffré de la spec est repris tel quel dans un test.
- Pas de volume (poids × reps) : supprimé à la demande de l'utilisateur, ne pas le réintroduire.
- Onglet Progrès : 3 vues, Général (par défaut), Muscles et Exercices.
- Indice de progression (Général et Muscles) : moyenne des progressions en % de chaque exercice par rapport à sa première semaine, jamais une moyenne des poids bruts.


## Fonctions pures
- Une fonction pure reçoit toutes ses données en paramètres (tableaux, date explicite) : pas de Dexie, pas de new Date(), pas de Promise.
- La lecture Dexie se fait dans des fonctions load... séparées, sans calcul.

## Specs
- Une spec n'est commitée qu'une fois toutes ses questions ouvertes répondues et transformées en règles avec un exemple.
- Format d'affichage unique et exact (séparateurs compris), jamais « ou ».
- Chaque filtre est appliqué à un seul endroit, cité dans la spec.
- Une fonction ne filtre que sur des données qu'elle reçoit en paramètre.
- Dates de calendrier passées en chaînes 'YYYY-MM-DD', jamais en Date.
- « Réutiliser X sans modification » exige de citer (fichier:ligne) que X couvre le cas.

## Formats et dates
- Jamais toLocaleString ni Intl.NumberFormat quand un format exact est imposé : formatage manuel.
- Jour de la semaine d'une chaîne 'YYYY-MM-DD' : calcul en UTC (Date.UTC, getUTCDay).
- Tout test sur des semaines ou des dates passe dans au moins deux fuseaux opposés.
- Le nom d'un test reprenant un exemple de spec cite sa section.

## Tests
- Un test qui modifie l'environnement (fuseau, langue, date) vérifie d'abord que la modification est effective.
- Toute fonction qui regroupe par MuscleGroup ignore les valeurs hors MUSCLE_GROUPS (héritage de la migration v3) et renvoie exactement 11 clés.

## Specs
- Toute fonction exportée ajoutée pendant l'implémentation est ajoutée à la spec, dans un commit docs séparé, avant le code.
- Comparaison de dates ISO : < et >, jamais localeCompare.

## Graphiques
- SVG maison uniquement. Géométrie (bornes, coordonnées) dans une fonction pure testée, jamais dans le JSX.
- Couleurs via les tokens. role="img" et aria-label sur chaque graphique.

## Interface
- Un écran par tâche. Les composants ne font ni calcul ni formatage : ils appellent src/db/.

## Méthode de travail
- Petit changement d'interface : mode Fast, pas de plan, pas de nouveau test.
- Données et calculs : mode Planning, tests de chaque exemple de la spec.
- L'agent lance npm run verify à la fin de chaque tâche et écrit la dernière ligne dans le walkthrough.
- Fin de tâche : npm run ship (verify puis push).

## Suivi
- docs/roadmap.md liste les lots (fait / en cours / à faire) et fait autorité sur l'ordre des tâches.
- L'agent met à jour roadmap.md dans le dernier commit de chaque lot.


## Règles
- Local-first : aucune donnée envoyée à un serveur.
- Une ligne par série (SetEntry), jamais de "3x10" stocké en texte.
- UI mobile d'abord, zones tactiles ≥ 44px.
- Pas de nouvelle dépendance sans la justifier dans le plan.
- Une tâche n'est terminée que si lint + test + build passent.
- Toujours terminer par un commit conventionnel (feat:, fix:, chore:...).
- Avant toute commande destructive (overwrite, rm, --force, reset) :
  vérifier que le travail est commité.
- Ne jamais supposer le comportement d'un flag CLI : vérifier avec --help.
- Faire un commit à la fin de chaque étape du plan (pas seulement à la fin).
- Les scripts d'outillage sont en Node (.mjs), jamais en bash ou PowerShell.
- Implémenter uniquement ce qui est demandé. Proposer les idées
  en plus dans une section "Suggestions" du plan, sans les coder.
- Schéma Dexie : ne JAMAIS modifier une version existante.
  Tout changement = nouvelle db.version(n+1) avec upgrade() si besoin,
  et un test de migration.
- Les specs de docs/specs/ font foi. Si une demande les contredit
  ou si une spec est ambiguë : le signaler dans le plan, ne pas trancher seul.
- Toute opération qui supprime des données saisies par l'utilisateur
  (séries, séances) doit être explicitement demandée par la spec.
- Une tâche n'est terminée que si `npm run verify` passe.
- Chaque commit inclut les tests de ce qu'il change (anciens adaptés + nouveaux). Jamais de commit « tests » séparé à la fin.
- Les correspondances sur un type union (ex. MuscleGroup) sont typées Record<Type, …> pour être exhaustives.
- useLiveQuery : si la fonction peut renvoyer undefined pour « absent », emballer le résultat dans un objet pour distinguer « en chargement » de « absent ».
- Logique répétée dans plusieurs composants (ex. blocage du défilement) : un hook partagé.
- Métrique globale sur plusieurs exercices : moyenne des progressions en % de chaque exercice par rapport à lui-même, jamais une moyenne des poids bruts.
