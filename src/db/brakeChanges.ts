import { deleteBrakePhotos } from './brakePhotos';
import {
  addMonthsClamped,
  todayLocalIso,
} from './engineOilChanges';
import { getDatabase } from './index';

export type BrakePartKind =
  | 'front_pad'
  | 'front_disc'
  | 'rear_pad'
  | 'rear_disc'
  | 'shoe'
  | 'drum'
  | 'fluid'
  | 'hose'
  | 'caliper'
  | 'wheel_cylinder'
  | 'master_cylinder'
  | 'booster'
  | 'parking_cable';

export const BRAKE_PART_KINDS: BrakePartKind[] = [
  'front_pad',
  'front_disc',
  'rear_pad',
  'rear_disc',
  'shoe',
  'drum',
  'fluid',
  'hose',
  'caliper',
  'wheel_cylinder',
  'master_cylinder',
  'booster',
  'parking_cable',
];

const BRAKE_INTERVALS: Record<BrakePartKind, { km: number; months: number }> = {
  front_pad: { km: 20_000, months: 12 },
  front_disc: { km: 40_000, months: 24 },
  rear_pad: { km: 40_000, months: 24 },
  rear_disc: { km: 60_000, months: 36 },
  shoe: { km: 40_000, months: 24 },
  drum: { km: 80_000, months: 48 },
  fluid: { km: 40_000, months: 24 },
  hose: { km: 60_000, months: 48 },
  caliper: { km: 80_000, months: 60 },
  wheel_cylinder: { km: 60_000, months: 48 },
  master_cylinder: { km: 80_000, months: 60 },
  booster: { km: 100_000, months: 60 },
  parking_cable: { km: 60_000, months: 48 },
};

export const BRAKE_PART_LABELS: Record<BrakePartKind, string> = {
  front_pad: 'Pastilha dianteira',
  front_disc: 'Disco dianteiro',
  rear_pad: 'Pastilha traseira',
  rear_disc: 'Disco traseiro',
  shoe: 'Lona',
  drum: 'Tambor',
  fluid: 'Fluido de freio',
  hose: 'Flexível',
  caliper: 'Pinça',
  wheel_cylinder: 'Cilindro de roda',
  master_cylinder: 'Cilindro mestre',
  booster: 'Servofreio',
  parking_cable: 'Cabo do freio de estacionamento',
};

export type BrakeChange = {
  id: number;
  vehicleId: number;
  partKind: BrakePartKind;
  changedOn: string;
  odometerKm: number;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type BrakeNextDue = {
  lastChange: BrakeChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type BrakeChangeRow = {
  id: number;
  vehicle_id: number;
  part_kind: string;
  changed_on: string;
  odometer_km: number;
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
};

const SELECT_COLUMNS = `id, vehicle_id, part_kind, changed_on, odometer_km,
  photo_uri_1, photo_uri_2, created_at`;

function isBrakePartKind(value: string): value is BrakePartKind {
  return BRAKE_PART_KINDS.includes(value as BrakePartKind);
}

function mapRow(row: BrakeChangeRow): BrakeChange {
  if (!isBrakePartKind(row.part_kind)) {
    throw new Error('Tipo de peça de freio inválido.');
  }

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    partKind: row.part_kind,
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

export function getBrakeChangePhotoUris(change: BrakeChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listBrakeChanges(
  vehicleId: number,
  partKind: BrakePartKind,
): Promise<BrakeChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<BrakeChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM brake_changes
     WHERE vehicle_id = ? AND part_kind = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
    partKind,
  );
  return rows.map(mapRow);
}

export async function createBrakeChange(input: {
  vehicleId: number;
  partKind: BrakePartKind;
  changedOn: string;
  odometerKm: number;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<BrakeChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
  const photoUri1 = normalizeOptionalText(input.photoUri1);
  const photoUri2 = normalizeOptionalText(input.photoUri2);

  if (!isBrakePartKind(input.partKind)) {
    throw new Error('Tipo de peça de freio inválido.');
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
    `INSERT INTO brake_changes (
      vehicle_id, part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.partKind,
    changedOn,
    odometerKm,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<BrakeChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM brake_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca de freio.');
  }

  return mapRow(created);
}

export async function deleteBrakeChange(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<BrakeChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM brake_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca de freio.');
  }

  const result = await db.runAsync(
    `DELETE FROM brake_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca de freio.');
  }

  deleteBrakePhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextBrakeDue(changes: BrakeChange[]): BrakeNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const interval = BRAKE_INTERVALS[lastChange.partKind];
  const nextDueDate = addMonthsClamped(lastChange.changedOn, interval.months);
  const nextDueKm = lastChange.odometerKm + interval.km;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
