import {
  addMonthsClamped,
  todayLocalIso,
} from './engineOilChanges';
import { deleteBeltPhotos } from './beltPhotos';
import { getDatabase } from './index';

export type BeltKind = 'timing' | 'accessory';

export const TIMING_BELT_INTERVAL_KM = 60_000;
export const TIMING_BELT_INTERVAL_MONTHS = 60;
export const ACCESSORY_BELT_INTERVAL_KM = 40_000;
export const ACCESSORY_BELT_INTERVAL_MONTHS = 48;

export type BeltChange = {
  id: number;
  vehicleId: number;
  beltKind: BeltKind;
  changedOn: string;
  odometerKm: number;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type BeltNextDue = {
  lastChange: BeltChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type BeltChangeRow = {
  id: number;
  vehicle_id: number;
  belt_kind: string;
  changed_on: string;
  odometer_km: number;
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
};

const SELECT_COLUMNS = `id, vehicle_id, belt_kind, changed_on, odometer_km,
  photo_uri_1, photo_uri_2, created_at`;

function isBeltKind(value: string): value is BeltKind {
  return value === 'timing' || value === 'accessory';
}

function mapRow(row: BeltChangeRow): BeltChange {
  if (!isBeltKind(row.belt_kind)) {
    throw new Error('Tipo de correia inválido.');
  }

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    beltKind: row.belt_kind,
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

function intervalForKind(beltKind: BeltKind): { km: number; months: number } {
  if (beltKind === 'timing') {
    return { km: TIMING_BELT_INTERVAL_KM, months: TIMING_BELT_INTERVAL_MONTHS };
  }
  return { km: ACCESSORY_BELT_INTERVAL_KM, months: ACCESSORY_BELT_INTERVAL_MONTHS };
}

export function getBeltChangePhotoUris(change: BeltChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listBeltChanges(
  vehicleId: number,
  beltKind: BeltKind,
): Promise<BeltChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<BeltChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM belt_changes
     WHERE vehicle_id = ? AND belt_kind = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
    beltKind,
  );
  return rows.map(mapRow);
}

export async function createBeltChange(input: {
  vehicleId: number;
  beltKind: BeltKind;
  changedOn: string;
  odometerKm: number;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<BeltChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
  const photoUri1 = normalizeOptionalText(input.photoUri1);
  const photoUri2 = normalizeOptionalText(input.photoUri2);

  if (!isBeltKind(input.beltKind)) {
    throw new Error('Tipo de correia inválido.');
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
    `INSERT INTO belt_changes (
      vehicle_id, belt_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.beltKind,
    changedOn,
    odometerKm,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<BeltChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM belt_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca de correia.');
  }

  return mapRow(created);
}

export async function deleteBeltChange(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<BeltChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM belt_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca de correia.');
  }

  const result = await db.runAsync(
    `DELETE FROM belt_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca de correia.');
  }

  deleteBeltPhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextBeltDue(changes: BeltChange[]): BeltNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const interval = intervalForKind(lastChange.beltKind);
  const nextDueDate = addMonthsClamped(lastChange.changedOn, interval.months);
  const nextDueKm = lastChange.odometerKm + interval.km;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
