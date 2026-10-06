import { deleteAirFilterPhotos } from './airFilterPhotos';
import {
  addMonthsClamped,
  todayLocalIso,
} from './engineOilChanges';
import { getDatabase } from './index';

export type AirFilterKind = 'engine' | 'cabin';

export const ENGINE_AIR_FILTER_INTERVAL_KM = 15_000;
export const ENGINE_AIR_FILTER_INTERVAL_MONTHS = 12;
export const CABIN_AIR_FILTER_INTERVAL_KM = 10_000;
export const CABIN_AIR_FILTER_INTERVAL_MONTHS = 12;

export type AirFilterChange = {
  id: number;
  vehicleId: number;
  filterKind: AirFilterKind;
  changedOn: string;
  odometerKm: number;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type AirFilterNextDue = {
  lastChange: AirFilterChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type AirFilterChangeRow = {
  id: number;
  vehicle_id: number;
  filter_kind: string;
  changed_on: string;
  odometer_km: number;
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
};

const SELECT_COLUMNS = `id, vehicle_id, filter_kind, changed_on, odometer_km,
  photo_uri_1, photo_uri_2, created_at`;

function isAirFilterKind(value: string): value is AirFilterKind {
  return value === 'engine' || value === 'cabin';
}

function mapRow(row: AirFilterChangeRow): AirFilterChange {
  if (!isAirFilterKind(row.filter_kind)) {
    throw new Error('Tipo de filtro de ar inválido.');
  }

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    filterKind: row.filter_kind,
    changedOn: row.changed_on,
    odometerKm: row.odometer_km,
    photoUri1: row.photo_uri_1,
    photoUri2: row.photo_uri_2,
    createdAt: row.created_at,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function intervalForKind(filterKind: AirFilterKind): { km: number; months: number } {
  if (filterKind === 'engine') {
    return { km: ENGINE_AIR_FILTER_INTERVAL_KM, months: ENGINE_AIR_FILTER_INTERVAL_MONTHS };
  }
  return { km: CABIN_AIR_FILTER_INTERVAL_KM, months: CABIN_AIR_FILTER_INTERVAL_MONTHS };
}

export function getAirFilterChangePhotoUris(change: AirFilterChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listAirFilterChanges(
  vehicleId: number,
  filterKind: AirFilterKind,
): Promise<AirFilterChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<AirFilterChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM air_filter_changes
     WHERE vehicle_id = ? AND filter_kind = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
    filterKind,
  );
  return rows.map(mapRow);
}

export async function createAirFilterChange(input: {
  vehicleId: number;
  filterKind: AirFilterKind;
  changedOn: string;
  odometerKm: number;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<AirFilterChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
  const photoUri1 = normalizeOptionalText(input.photoUri1);
  const photoUri2 = normalizeOptionalText(input.photoUri2);

  if (!isAirFilterKind(input.filterKind)) {
    throw new Error('Tipo de filtro de ar inválido.');
  }

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
    `INSERT INTO air_filter_changes (
      vehicle_id, filter_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.filterKind,
    changedOn,
    odometerKm,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<AirFilterChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM air_filter_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca de filtro de ar.');
  }

  return mapRow(created);
}

export async function deleteAirFilterChange(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<AirFilterChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM air_filter_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca de filtro de ar.');
  }

  const result = await db.runAsync(
    `DELETE FROM air_filter_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca de filtro de ar.');
  }

  deleteAirFilterPhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextAirFilterDue(changes: AirFilterChange[]): AirFilterNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const interval = intervalForKind(lastChange.filterKind);
  const nextDueDate = addMonthsClamped(lastChange.changedOn, interval.months);
  const nextDueKm = lastChange.odometerKm + interval.km;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
