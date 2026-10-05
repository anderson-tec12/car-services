import { deleteOilPhotos } from './oilPhotos';
import { getDatabase } from './index';

export const ENGINE_OIL_INTERVAL_KM = 10_000;
export const ENGINE_OIL_INTERVAL_MONTHS = 12;

export const OIL_TYPES = ['sintetico', 'semissintetico', 'mineral'] as const;

export type OilType = (typeof OIL_TYPES)[number];

export type EngineOilChange = {
  id: number;
  vehicleId: number;
  changedOn: string;
  odometerKm: number;
  filterChanged: boolean;
  oilBrand: string | null;
  oilViscosity: string | null;
  oilType: OilType | null;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type EngineOilNextDue = {
  lastChange: EngineOilChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type EngineOilChangeRow = {
  id: number;
  vehicle_id: number;
  changed_on: string;
  odometer_km: number;
  filter_changed: number;
  oil_brand: string | null;
  oil_viscosity: string | null;
  oil_type: string | null;
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
};

const OIL_TYPE_LABELS: Record<OilType, string> = {
  sintetico: 'Sintético',
  semissintetico: 'Semissintético',
  mineral: 'Mineral',
};

const SELECT_COLUMNS = `id, vehicle_id, changed_on, odometer_km, filter_changed,
  oil_brand, oil_viscosity, oil_type, photo_uri_1, photo_uri_2, created_at`;

function isOilType(value: string | null): value is OilType {
  return value !== null && (OIL_TYPES as readonly string[]).includes(value);
}

function mapRow(row: EngineOilChangeRow): EngineOilChange {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    changedOn: row.changed_on,
    odometerKm: row.odometer_km,
    filterChanged: row.filter_changed === 1,
    oilBrand: row.oil_brand,
    oilViscosity: row.oil_viscosity,
    oilType: isOilType(row.oil_type) ? row.oil_type : null,
    photoUri1: row.photo_uri_1,
    photoUri2: row.photo_uri_2,
    createdAt: row.created_at,
  };
}

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOilType(value: OilType | null | undefined): OilType | null {
  if (value == null) {
    return null;
  }
  if (!isOilType(value)) {
    throw new Error('Tipo de óleo inválido.');
  }
  return value;
}

export function addMonthsClamped(isoDate: string, months: number): string {
  const date = parseLocalDate(isoDate);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return formatLocalDate(target);
}

export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString('pt-BR')} km`;
}

export function formatOilType(oilType: OilType): string {
  return OIL_TYPE_LABELS[oilType];
}

export function todayLocalIso(): string {
  return formatLocalDate(new Date());
}

export function getOilChangePhotoUris(change: EngineOilChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listEngineOilChanges(vehicleId: number): Promise<EngineOilChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<EngineOilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM engine_oil_changes
     WHERE vehicle_id = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
  );
  return rows.map(mapRow);
}

export async function createEngineOilChange(input: {
  vehicleId: number;
  changedOn: string;
  odometerKm: number;
  filterChanged: boolean;
  oilBrand?: string | null;
  oilViscosity?: string | null;
  oilType?: OilType | null;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<EngineOilChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
  const oilBrand = normalizeOptionalText(input.oilBrand);
  const oilViscosity = normalizeOptionalText(input.oilViscosity);
  const oilType = normalizeOilType(input.oilType);
  const photoUri1 = normalizeOptionalText(input.photoUri1);
  const photoUri2 = normalizeOptionalText(input.photoUri2);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(changedOn)) {
    throw new Error('Data inválida.');
  }

  if (changedOn > todayLocalIso()) {
    throw new Error('A data da troca não pode ser futura.');
  }

  if (!Number.isFinite(odometerKm) || odometerKm <= 0) {
    throw new Error('Informe a quilometragem atual (maior que zero).');
  }

  const result = await db.runAsync(
    `INSERT INTO engine_oil_changes (
      vehicle_id, changed_on, odometer_km, filter_changed,
      oil_brand, oil_viscosity, oil_type, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    changedOn,
    odometerKm,
    input.filterChanged ? 1 : 0,
    oilBrand,
    oilViscosity,
    oilType,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<EngineOilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM engine_oil_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca de óleo.');
  }

  return mapRow(created);
}

export async function deleteEngineOilChange(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<EngineOilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM engine_oil_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca de óleo.');
  }

  const result = await db.runAsync(
    `DELETE FROM engine_oil_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca de óleo.');
  }

  deleteOilPhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextEngineOilDue(changes: EngineOilChange[]): EngineOilNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const nextDueDate = addMonthsClamped(lastChange.changedOn, ENGINE_OIL_INTERVAL_MONTHS);
  const nextDueKm = lastChange.odometerKm + ENGINE_OIL_INTERVAL_KM;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
