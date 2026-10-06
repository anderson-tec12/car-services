import {
  addMonthsClamped,
  todayLocalIso,
} from './engineOilChanges';
import { getDatabase } from './index';
import { deleteIgnitionCoilPhotos } from './ignitionCoilPhotos';

export const IGNITION_COIL_INTERVAL_KM = 60_000;
export const IGNITION_COIL_INTERVAL_MONTHS = 48;

export type IgnitionCoilChange = {
  id: number;
  vehicleId: number;
  changedOn: string;
  odometerKm: number;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type IgnitionCoilNextDue = {
  lastChange: IgnitionCoilChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type IgnitionCoilChangeRow = {
  id: number;
  vehicle_id: number;
  changed_on: string;
  odometer_km: number;
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
};

const SELECT_COLUMNS = `id, vehicle_id, changed_on, odometer_km,
  photo_uri_1, photo_uri_2, created_at`;

function mapRow(row: IgnitionCoilChangeRow): IgnitionCoilChange {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
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

export function getIgnitionCoilChangePhotoUris(change: IgnitionCoilChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listIgnitionCoilChanges(
  vehicleId: number,
): Promise<IgnitionCoilChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<IgnitionCoilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM ignition_coil_changes
     WHERE vehicle_id = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
  );
  return rows.map(mapRow);
}

export async function createIgnitionCoilChange(input: {
  vehicleId: number;
  changedOn: string;
  odometerKm: number;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<IgnitionCoilChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
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
    `INSERT INTO ignition_coil_changes (
      vehicle_id, changed_on, odometer_km, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?)`,
    input.vehicleId,
    changedOn,
    odometerKm,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<IgnitionCoilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM ignition_coil_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca de bobinas.');
  }

  return mapRow(created);
}

export async function deleteIgnitionCoilChange(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<IgnitionCoilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM ignition_coil_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca de bobinas.');
  }

  const result = await db.runAsync(
    `DELETE FROM ignition_coil_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca de bobinas.');
  }

  deleteIgnitionCoilPhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextIgnitionCoilDue(
  changes: IgnitionCoilChange[],
): IgnitionCoilNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const nextDueDate = addMonthsClamped(lastChange.changedOn, IGNITION_COIL_INTERVAL_MONTHS);
  const nextDueKm = lastChange.odometerKm + IGNITION_COIL_INTERVAL_KM;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
