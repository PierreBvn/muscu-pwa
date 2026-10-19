---
name: tests
description: Conventions de tests Vitest, mocks d'environnement (dates, fuseaux horaires), requêtes Testing Library et tests garde-fous. À charger pour la rédaction ou la refonte de suites de tests.
---

# Conventions de Tests (Vitest & Testing Library)

## Structure & Emplacement
- Les fichiers de tests sont situés dans un sous-dossier `__tests__/` adjacent au code testé (ex. `src/db/__tests__/stats.test.ts` pour `src/db/stats.ts`).
- Ne jamais séparer les tests dans un commit différé : chaque commit inclut les tests de ce qu'il modifie.

## Tests d'interface (Testing Library)
- Interroger le DOM exclusivement par rôle accessible (`getByRole`, `getAllByRole`) ou par libellé associé (`getByLabelText`).
- Ne jamais faire d'assertion sur la présence ou l'absence de classes CSS.

## Gestion des dates et fuseaux horaires
- Figer l'horloge système avec `vi.useFakeTimers()` et `vi.setSystemTime()` pour tout test dépendant du temps.
- **Vérification d'environnement** : Tout test modifiant l'environnement (fuseau, langue, horloge) doit d'abord vérifier par une assertion que le mock est réellement actif.
- **Multi-fuseaux** : Tout test portant sur le calcul de semaines, de jours ou de dates locales doit passer avec succès dans au moins deux fuseaux horaires géographiquement opposés.
- Jour de la semaine calculé en UTC (`Date.UTC`, `getUTCDay`) pour une chaîne `'YYYY-MM-DD'`.

## Qualité des assertions & Garde-fous
- **Parcours utilisateur** : Un test d'aller-retour traverse l'intégralité du cycle réel (sérialisation/parsing JSON compris).
- **Garde-fou** : Comparer à une valeur littérale attendue écrite en dur dans le test, jamais au résultat d'une fonction auxiliaire partagée avec le code source.
- **Espions** : Tout espion (`vi.spyOn`, mock function) fait l'objet d'une assertion explicite sur son appel (`expect(spy).toHaveBeenCalled()`).
- **Prouver le plan** : Toute affirmation d'un plan (« ne peut pas arriver », « contient nécessairement ») doit être prouvée par un test automatisé.
- **Traçabilité** : Le libellé d'un test implémentant un cas de spécification cite le nom de la spec et sa section.
- **Remplacement** : Tout test supprimé lors d'un refactoring est remplacé par un test équivalent couvrant le nouveau comportement.
