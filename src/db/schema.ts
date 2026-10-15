import Dexie, { type EntityTable } from 'dexie';

export const MUSCLE_GROUPS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Bras',
  'Jambes',
  'Abdominaux',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  archived?: boolean;
}

export interface Session {
  id?: number;
  date: string;
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
}

export const db = new Dexie('MuscuPWA') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  sets: EntityTable<SetEntry, 'id'>;
};

db.version(1).stores({
  exercises: '++id, name',
  sessions: '++id, date',
  sets: '++id, sessionId, exerciseId, [sessionId+order]',
});
