import { describe, it, expect, afterEach } from 'vitest';
import { db } from '../schema';

afterEach(async () => {
  await db.delete();
});

describe('Dexie database', () => {
  it('opens the database successfully', async () => {
    await db.open();
    expect(db.isOpen()).toBe(true);
  });

  it('has the expected tables', async () => {
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'exercises',
      'sessions',
      'sets',
    ]);
  });
});
