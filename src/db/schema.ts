import Dexie, { type EntityTable } from 'dexie';
import { migrateV3MuscleGroups } from './migrations/v3-muscle-groups';

export const MUSCLE_GROUPS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Biceps',
  'Triceps',
  'Avant-bras',
  'Abdos',
  'Quadriceps',
  'Ischios',
  'Fessiers',
  'Mollets',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Convertit un objet Date en jour de la semaine selon la convention 1=lundi … 7=dimanche.
 */
export function toWeekday(date: Date): Weekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as Weekday;
}

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  archived?: boolean;
  weightStep?: number;
}

export interface Session {
  id?: number;
  date: string;
  programId?: number;
  startedAt: string;
  endedAt?: string;
  title?: string;
  notes?: string;
}

export interface SetEntry {
  id?: number;
  sessionId: number;
  exerciseId: number;
  order: number;
  reps: number;
  weight: number;
  type: 'warmup' | 'work';
  createdAt: string;
}

export interface Program {
  id?: number;
  name: string;
  weekdays: number[];
}

export interface ProgramExercise {
  id?: number;
  programId: number;
  exerciseId: number;
  order: number;
  warmupSets: number;
  workSets: number;
}

export interface SessionExercise {
  id?: number;
  sessionId: number;
  exerciseId: number;
  order: number;
  warmupSets: number;
  workSets: number;
  skipped?: boolean;
}

export const db = new Dexie('MuscuPWA') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  sets: EntityTable<SetEntry, 'id'>;
  programs: EntityTable<Program, 'id'>;
  programExercises: EntityTable<ProgramExercise, 'id'>;
  sessionExercises: EntityTable<SessionExercise, 'id'>;
};

// Version 1 initiale
db.version(1).stores({
  exercises: '++id, name',
  sessions: '++id, date',
  sets: '++id, sessionId, exerciseId, [sessionId+order]',
});

// Version 2 : Programmes, exercices de programme, exercices de séance et extensions
db.version(2)
  .stores({
    exercises: '++id, name',
    sessions: '++id, date, programId',
    sets: '++id, sessionId, exerciseId, [exerciseId+createdAt], [sessionId+order]',
    programs: '++id, name',
    programExercises: '++id, programId, [programId+order]',
    sessionExercises: '++id, sessionId, [sessionId+order]',
  })
  .upgrade(async (tx) => {
    const sessionStarts = new Map<number, string>();
    await tx
      .table('sessions')
      .toCollection()
      .modify((session) => {
        const startedAt = new Date(`${session.date}T00:00:00`).toISOString();
        session.startedAt = startedAt;
        session.endedAt = startedAt;
        if (session.id !== undefined) {
          sessionStarts.set(session.id, startedAt);
        }
      });

    await tx
      .table('sets')
      .toCollection()
      .modify((set) => {
        set.type = 'work';
        const baseTimeIso = sessionStarts.get(set.sessionId);
        const baseDate = baseTimeIso ? new Date(baseTimeIso) : new Date();
        const orderSeconds = typeof set.order === 'number' ? set.order : 0;
        const setDate = new Date(baseDate.getTime() + orderSeconds * 1000);
        set.createdAt = setDate.toISOString();
      });
  });

// Version 3 : Nouveaux groupes musculaires
db.version(3)
  .stores({
    exercises: '++id, name',
  })
  .upgrade(migrateV3MuscleGroups);
