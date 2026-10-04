import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'car-services.db';

let database: SQLite.SQLiteDatabase | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      plate TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS engine_oil_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      filter_changed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );
  `);

  const oilColumns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(engine_oil_changes)',
  );
  const hasFilterChanged = oilColumns.some((column) => column.name === 'filter_changed');
  if (!hasFilterChanged) {
    await db.execAsync(
      'ALTER TABLE engine_oil_changes ADD COLUMN filter_changed INTEGER NOT NULL DEFAULT 0',
    );
  }
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrate(database);
  return database;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }

  return database;
}
