import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'car-services.db';

let database: SQLite.SQLiteDatabase | null = null;

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((item) => item.name === column);
  if (!exists) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

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

    CREATE TABLE IF NOT EXISTS coolant_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      flush_done INTEGER NOT NULL DEFAULT 0,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS transmission_oil_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      oil_brand TEXT,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS spark_plug_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS ignition_coil_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS belt_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      belt_kind TEXT NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS fuel_filter_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS air_filter_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      filter_kind TEXT NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS front_suspension_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      part_kind TEXT NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS rear_suspension_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      part_kind TEXT NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS brake_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      part_kind TEXT NOT NULL,
      changed_on TEXT NOT NULL,
      odometer_km INTEGER NOT NULL,
      photo_uri_1 TEXT,
      photo_uri_2 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      occurred_on TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolution_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS occurrence_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      occurrence_id INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      kind TEXT NOT NULL,
      uri TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (occurrence_id) REFERENCES occurrences (id)
    );

    CREATE TABLE IF NOT EXISTS occurrence_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      occurrence_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (occurrence_id) REFERENCES occurrences (id)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      vehicle_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      store_name TEXT NOT NULL,
      quoted_on TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      quote_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      link TEXT,
      price_cents INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (quote_id) REFERENCES quotes (id)
    );

    CREATE TABLE IF NOT EXISTS alert_notification_log (
      alert_key TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await ensureColumn(db, 'engine_oil_changes', 'filter_changed', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'engine_oil_changes', 'oil_brand', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'oil_viscosity', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'oil_type', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'photo_uri_1', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'photo_uri_2', 'TEXT');

  await db.execAsync(`
    INSERT INTO occurrence_notes (occurrence_id, body, created_at)
    SELECT occurrences.id, trim(occurrences.notes), occurrences.created_at
    FROM occurrences
    WHERE occurrences.notes IS NOT NULL
      AND trim(occurrences.notes) != ''
      AND NOT EXISTS (
        SELECT 1 FROM occurrence_notes
        WHERE occurrence_notes.occurrence_id = occurrences.id
      );
  `);
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
