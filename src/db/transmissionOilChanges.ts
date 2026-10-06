import {
  addMonthsClamped,
  todayLocalIso,
} from './engineOilChanges';
import { getDatabase } from './index';
import { deleteTransmissionOilPhotos } from './transmissionOilPhotos';

export const TRANSMISSION_OIL_INTERVAL_KM = 40_000;
export const TRANSMISSION_OIL_INTERVAL_MONTHS = 24;

export type TransmissionOilChange = {
  id: number;
  vehicleId: number;
  changedOn: string;
  odometerKm: number;
  oilBrand: string | null;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type TransmissionOilNextDue = {
  lastChange: TransmissionOilChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type TransmissionOilChangeRow = {
  id: number;
  vehicle_id: number;
  changed_on: string;
  odometer_km: number;
  oil_brand: string | null;
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
};

const SELECT_COLUMNS = `id, vehicle_id, changed_on, odometer_km, oil_brand,
  photo_uri_1, photo_uri_2, created_at`;

function mapRow(row: TransmissionOilChangeRow): TransmissionOilChange {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    changedOn: row.changed_on,
    odometerKm: row.odometer_km,
    oilBrand: row.oil_brand,
    photoUri1: row.photo_uri_1,
    photoUri2: row.photo_uri_2,
    createdAt: row.created_at,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export function getTransmissionOilChangePhotoUris(change: TransmissionOilChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listTransmissionOilChanges(
  vehicleId: number,
): Promise<TransmissionOilChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<TransmissionOilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM transmission_oil_changes
     WHERE vehicle_id = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
  );
  return rows.map(mapRow);
}

export async function createTransmissionOilChange(input: {
  vehicleId: number;
  changedOn: string;
  odometerKm: number;
  oilBrand?: string | null;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<TransmissionOilChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
  const oilBrand = normalizeOptionalText(input.oilBrand);
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
    `INSERT INTO transmission_oil_changes (
      vehicle_id, changed_on, odometer_km, oil_brand, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    changedOn,
    odometerKm,
    oilBrand,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<TransmissionOilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM transmission_oil_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca de óleo de câmbio.');
  }

  return mapRow(created);
}

export async function deleteTransmissionOilChange(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<TransmissionOilChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM transmission_oil_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca de óleo de câmbio.');
  }

  const result = await db.runAsync(
    `DELETE FROM transmission_oil_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca de óleo de câmbio.');
  }

  deleteTransmissionOilPhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextTransmissionOilDue(
  changes: TransmissionOilChange[],
): TransmissionOilNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const nextDueDate = addMonthsClamped(lastChange.changedOn, TRANSMISSION_OIL_INTERVAL_MONTHS);
  const nextDueKm = lastChange.odometerKm + TRANSMISSION_OIL_INTERVAL_KM;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
