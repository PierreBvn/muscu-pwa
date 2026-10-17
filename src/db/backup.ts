import { db } from './schema';
import { formatLocalDate } from './sessions';

export interface BackupData {
  app: 'muscu-pwa';
  dbVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/**
 * Génère le nom de fichier par défaut pour l'export selon la convention
 * muscu-backup-AAAA-MM-JJ.json basée sur la date locale.
 */
export function getBackupFilename(date: Date = new Date()): string {
  return `muscu-backup-${formatLocalDate(date)}.json`;
}

/**
 * Exporte toutes les tables de db.tables sans aucun filtre (enregistrements
 * archivés inclus) avec conservation de leurs identifiants d'origine.
 */
export async function exportBackup(options?: {
  now?: Date;
}): Promise<BackupData> {
  const tables: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    tables[table.name] = await table.toArray();
  }

  return {
    app: 'muscu-pwa',
    dbVersion: db.verno,
    exportedAt: (options?.now ?? new Date()).toISOString(),
    tables,
  };
}

/**
 * Valide l'intégrité et la conformité d'une sauvegarde avant toute écriture.
 * Rejette si :
 * - Le JSON est invalide
 * - L'application n'est pas "muscu-pwa"
 * - La version de la base est différente de db.verno
 * - Des tables du schéma manquent ou ne sont pas des tableaux
 * - Une table inconnue est présente
 * - Une ligne n'est pas un objet ou possède un identifiant non entier positif
 */
export function parseBackup(text: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Format JSON invalide.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Format de sauvegarde invalide : objet attendu.');
  }

  const raw = parsed as Record<string, unknown>;

  if (raw.app !== 'muscu-pwa') {
    throw new Error('Sauvegarde invalide : application non reconnue.');
  }

  if (raw.dbVersion !== db.verno) {
    throw new Error(
      `Sauvegarde incompatible : version ${String(raw.dbVersion)} différente de ${db.verno}.`
    );
  }

  if (
    typeof raw.tables !== 'object' ||
    raw.tables === null ||
    Array.isArray(raw.tables)
  ) {
    throw new Error('Format de sauvegarde invalide : propriété tables attendue.');
  }

  const tablesObj = raw.tables as Record<string, unknown>;
  const validTableNames = new Set(db.tables.map((t) => t.name));

  // Vérification des tables inconnues
  for (const key of Object.keys(tablesObj)) {
    if (!validTableNames.has(key)) {
      throw new Error(`Table inconnue dans la sauvegarde : ${key}.`);
    }
  }

  // Vérification que toutes les tables de db.tables sont présentes et conformes
  for (const table of db.tables) {
    const rows = tablesObj[table.name];
    if (!Array.isArray(rows)) {
      throw new Error(`Table manquante ou invalide : ${table.name}.`);
    }

    for (const row of rows) {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        throw new Error(`Ligne invalide dans la table ${table.name}.`);
      }

      const record = row as Record<string, unknown>;
      if (
        typeof record.id !== 'number' ||
        !Number.isInteger(record.id) ||
        record.id <= 0
      ) {
        throw new Error(
          `Identifiant invalide dans la table ${table.name}.`
        );
      }
    }
  }

  return raw as unknown as BackupData;
}

/**
 * Restaure l'ensemble des données depuis un objet BackupData dans une unique
 * transaction en écriture sur toutes les tables de db.tables.
 * Vide d'abord chaque table puis réinsère les lignes avec leurs identifiants d'origine.
 * En cas d'erreur, la transaction entière est annulée (rollback).
 */
export async function importBackup(data: BackupData): Promise<void> {
  if (
    !data ||
    data.app !== 'muscu-pwa' ||
    data.dbVersion !== db.verno ||
    typeof data.tables !== 'object' ||
    data.tables === null
  ) {
    throw new Error('Données de sauvegarde invalides.');
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      const rows = data.tables[table.name];
      if (!Array.isArray(rows)) {
        throw new Error(`Table manquante dans la sauvegarde : ${table.name}.`);
      }

      const targetTable =
        (db as unknown as Record<string, typeof table>)[table.name] ?? table;

      await targetTable.clear();
      if (rows.length > 0) {
        await targetTable.bulkAdd(rows);
      }
    }
  });
}
