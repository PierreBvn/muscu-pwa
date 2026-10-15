import { describe, it, expect, afterEach } from 'vitest';
import { db, toWeekday } from '../schema';

afterEach(async () => {
  await db.delete();
});

describe('Dexie database', () => {
  it('opens the database successfully', async () => {
    await db.open();
    expect(db.isOpen()).toBe(true);
  });

  it('has the expected tables in v2', async () => {
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'exercises',
      'programExercises',
      'programs',
      'sessionExercises',
      'sessions',
      'sets',
    ]);
  });
});

describe('toWeekday', () => {
  it('correctly maps JavaScript days to ISO 1..7 (1=lundi ... 7=dimanche)', () => {
    // 2026-10-12 est un lundi
    expect(toWeekday(new Date('2026-10-12T12:00:00'))).toBe(1);
    // 2026-10-13 est un mardi
    expect(toWeekday(new Date('2026-10-13T12:00:00'))).toBe(2);
    // 2026-10-14 est un mercredi
    expect(toWeekday(new Date('2026-10-14T12:00:00'))).toBe(3);
    // 2026-10-15 est un jeudi
    expect(toWeekday(new Date('2026-10-15T12:00:00'))).toBe(4);
    // 2026-10-16 est un vendredi
    expect(toWeekday(new Date('2026-10-16T12:00:00'))).toBe(5);
    // 2026-10-17 est un samedi
    expect(toWeekday(new Date('2026-10-17T12:00:00'))).toBe(6);
    // 2026-10-18 est un dimanche
    expect(toWeekday(new Date('2026-10-18T12:00:00'))).toBe(7);
  });
});
