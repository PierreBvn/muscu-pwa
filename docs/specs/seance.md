# Spec : Programmes et séance en cours

## Besoin
Mes séances sont fixées par jour de la semaine, avec presque toujours
les mêmes exercices. À la salle, je veux enregistrer chaque série en
1 à 3 taps, d'une main, sans rien ressaisir.

## Modèle de données (migration Dexie v2)
- Program : id, name, weekdays (1=lundi … 7=dimanche, plusieurs possibles).
- ProgramExercise : id, programId, exerciseId, order,
  warmupSets (défaut 1), workSets (défaut 3, entre 1 et 6).
- Exercise : + weightStep?: number (défaut 2,5 kg si absent).
- Session : + programId?, startedAt, endedAt?.
- SetEntry : + type ('warmup' | 'work'), createdAt.
- SessionExercise : id, sessionId, exerciseId, order, warmupSets, workSets,
  skipped?: boolean. Copie des ProgramExercise au démarrage ; les
  exceptions de séance modifient cette table, jamais le programme.
- Session.date (YYYY-MM-DD, date LOCALE) conservé. startedAt, endedAt,
  SetEntry.createdAt : ISO 8601.
- warmupSets : 0 ou 1 non réglable dans l'interface (champ conservé en base pour évolution future).
- workSets : 1 à 6.
- Index : sets [exerciseId+createdAt], [sessionId+order] ;
  sessionExercises [sessionId+order]. Pas d'index sur endedAt
  (IndexedDB n'indexe pas les champs absents).
- Toute la v2 (tables + champs) dans UNE seule migration.


## Programmes
- Écran "Programmes" : créer, renommer, supprimer un programme,
  choisir ses jours, ajouter/retirer/réordonner ses exercices,
  régler warmupSets et workSets par exercice.
- Supprimer un programme n'efface aucune séance passée.

## Démarrer une séance
- Séance en cours (endedAt absent) → bouton "Reprendre".
- Sinon : bouton "Démarrer <programme du jour>".
  Plusieurs programmes ce jour-là → le premier par ordre de nom.
- Toujours disponible : "Choisir un autre programme" et "Séance libre".
- Démarrer = copier les exercices du programme dans la séance.

## Pendant la séance
- Chaque exercice affiche ses séries prévues :
  "Échauffement" × warmupSets puis "Série 1..N" × workSets.
- Exceptions (cette séance UNIQUEMENT, le programme ne change pas) :
  ajouter un exercice, retirer/sauter un exercice, ajouter/retirer une série.

## Saisie d'une série
- Boutons de poids (vraies séries) :
  [mode − pas] [MODE] [mode + pas] [mode + 2 pas] [Autre]
  - mode = Poids de référence (vraies séries) :
  1. Séance en cours contenant déjà une vraie série de cet exercice
     → poids de la dernière de ces séries.
  2. Sinon → poids le plus lourd parmi les vraies séries de la séance
     terminée la plus récente contenant au moins une vraie série
     de cet exercice.
  3. Sinon → null (saisie manuelle uniquement).
- Boutons : [réf − pas] [RÉF] [réf + pas] [réf + 2 pas] [Autre],
  RÉF présélectionné. Boutons < 0 masqués. Poids arrondis au centième.

  - pas = weightStep de l'exercice (2,5 par défaut).
  - Ne jamais proposer de poids < 0.
  - Aucun historique → saisie manuelle uniquement.
- Échauffement : propose le dernier poids d'échauffement utilisé
  sur cet exercice, sinon saisie manuelle.
- Boutons de reps : [6] [8] [10] [12] [Autre].
- Présélection : MODE pour le poids, dernières reps de cet exercice pour les reps.
  → si rien ne change, valider une série = 1 tap.
- "Autre" : poids décimal, virgule ET point ("82,5" = 82.5), 0 autorisé
  (poids du corps). Reps : entier ≥ 1.

## Minuteur de repos
- Démarre automatiquement après une vraie série (pas après un échauffement).
- 2 min, boutons "+30 s" et "Passer".
- Basé sur une heure de fin (endsAt) stockée de façon persistante :
  il reste juste après un passage en arrière-plan ou un rechargement.
- Son à la fin si l'app est ouverte. Pas de vibration (impossible sur iOS).
- Écran maintenu allumé (Wake Lock) pendant une séance en cours.

## Règles métier
- Une seule séance en cours à la fois.
- Chaque série est écrite en base immédiatement (iOS peut tuer la PWA).
- Une séance terminée sans aucune série est supprimée.
- Exercices archivés : exclus des sélecteurs, conservés dans l'historique.

## Navigation
Barre d'onglets : Séance / Programmes / Exercices.
Pas de bibliothèque de routing sauf justification.

## Hors scope
Historique, graphiques, modification d'une séance terminée,
notifications, synchronisation.

## Décisions complémentaires
- Jour sans programme : "Aucun programme prévu aujourd'hui" + "Choisir
  un programme" + "Séance libre" (0 exercice au départ).
- Terminer : confirmation si des séries prévues restent. Pas d'action
  "Abandonner". Séance sans série → supprimée.
- Séance oubliée : "Reprendre la séance du <date>" + "Clôturer" ;
  endedAt = createdAt de la dernière série.
- Aucun historique : poids en saisie manuelle, reps sans présélection.
- Boutons de poids < 0 : masqués.
- Reps présélectionnées : série précédente de la séance, sinon dernière
  vraie série de la séance précédente.
- Échauffement : [Dernier poids : X kg] [Autre] + mêmes boutons de reps.
- Série validée : modifiable / supprimable pendant la séance en cours.
- Exercice archivé : reste dans les programmes (badge), absent des sélecteurs.
- Programme supprimé : session.programId conservé, affiché "Programme supprimé".
- Réordonnancement : boutons ↑ ↓ (≥ 44px), pas de drag & drop.
- Minuteur : localStorage { endsAt, sessionId } ; ignoré si sessionId
  ≠ séance en cours ; expiré au retour → pas de son, minuteur effacé.
  Non bloquant (bandeau). Son via Web Audio, débloqué au tap de validation.
- Wake Lock redemandé à chaque retour au premier plan pendant une séance.
- Saisie "Autre" : <input type="text" inputMode="decimal">, parsing
  via la fonction testée de la couche données.
- Reps présélectionnées, par type de série (warmup et work séparés) :
  dernière série du même type sur cet exercice, sinon aucune présélection.
