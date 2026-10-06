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
  `);

  await ensureColumn(db, 'engine_oil_changes', 'filter_changed', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'engine_oil_changes', 'oil_brand', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'oil_viscosity', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'oil_type', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'photo_uri_1', 'TEXT');
  await ensureColumn(db, 'engine_oil_changes', 'photo_uri_2', 'TEXT');
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
