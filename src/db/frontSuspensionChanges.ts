import {
  addMonthsClamped,
  todayLocalIso,
} from './engineOilChanges';
import { deleteFrontSuspensionPhotos } from './frontSuspensionPhotos';
import { getDatabase } from './index';

export type FrontSuspensionPartKind =
  | 'shock'
  | 'spring'
  | 'bump_stop'
  | 'boot'
  | 'mount'
  | 'control_arm'
  | 'control_arm_bushing'
  | 'ball_joint'
  | 'sway_bar_link'
  | 'sway_bar'
  | 'sway_bar_bushing'
  | 'wheel_bearing';

export const FRONT_SUSPENSION_PART_KINDS: FrontSuspensionPartKind[] = [
  'shock',
  'spring',
  'bump_stop',
  'boot',
  'mount',
  'control_arm',
  'control_arm_bushing',
  'ball_joint',
  'sway_bar_link',
  'sway_bar',
  'sway_bar_bushing',
  'wheel_bearing',
];

const FRONT_SUSPENSION_INTERVALS: Record<
  FrontSuspensionPartKind,
  { km: number; months: number }
> = {
  shock: { km: 60_000, months: 48 },
  spring: { km: 80_000, months: 60 },
  bump_stop: { km: 40_000, months: 36 },
  boot: { km: 40_000, months: 36 },
  mount: { km: 60_000, months: 48 },
  control_arm: { km: 80_000, months: 60 },
  control_arm_bushing: { km: 40_000, months: 36 },
  ball_joint: { km: 40_000, months: 36 },
  sway_bar_link: { km: 30_000, months: 24 },
  sway_bar: { km: 100_000, months: 60 },
  sway_bar_bushing: { km: 40_000, months: 36 },
  wheel_bearing: { km: 60_000, months: 48 },
};

export const FRONT_SUSPENSION_PART_LABELS: Record<FrontSuspensionPartKind, string> = {
  shock: 'Amortecedor',
  spring: 'Mola',
  bump_stop: 'Batente',
  boot: 'Coifa',
  mount: 'Coxim',
  control_arm: 'Bandeja',
  control_arm_bushing: 'Bucha da bandeja',
  ball_joint: 'Pivô',
  sway_bar_link: 'Bieleta',
  sway_bar: 'Barra estabilizadora',
  sway_bar_bushing: 'Bucha da barra estabilizadora',
  wheel_bearing: 'Rolamento de roda',
};

export type FrontSuspensionChange = {
  id: number;
  vehicleId: number;
  partKind: FrontSuspensionPartKind;
  changedOn: string;
  odometerKm: number;
  photoUri1: string | null;
  photoUri2: string | null;
  createdAt: string;
};

export type FrontSuspensionNextDue = {
  lastChange: FrontSuspensionChange;
  nextDueDate: string;
  nextDueKm: number;
  isOverdueByDate: boolean;
};

type FrontSuspensionChangeRow = {
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

function isFrontSuspensionPartKind(value: string): value is FrontSuspensionPartKind {
  return FRONT_SUSPENSION_PART_KINDS.includes(value as FrontSuspensionPartKind);
}

function mapRow(row: FrontSuspensionChangeRow): FrontSuspensionChange {
  if (!isFrontSuspensionPartKind(row.part_kind)) {
    throw new Error('Tipo de peça da suspensão dianteira inválido.');
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

export function getFrontSuspensionChangePhotoUris(change: FrontSuspensionChange): string[] {
  return [change.photoUri1, change.photoUri2].filter((uri): uri is string => Boolean(uri));
}

export async function listFrontSuspensionChanges(
  vehicleId: number,
  partKind: FrontSuspensionPartKind,
): Promise<FrontSuspensionChange[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<FrontSuspensionChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM front_suspension_changes
     WHERE vehicle_id = ? AND part_kind = ?
     ORDER BY changed_on DESC, created_at DESC, id DESC`,
    vehicleId,
    partKind,
  );
  return rows.map(mapRow);
}

export async function createFrontSuspensionChange(input: {
  vehicleId: number;
  partKind: FrontSuspensionPartKind;
  changedOn: string;
  odometerKm: number;
  photoUri1?: string | null;
  photoUri2?: string | null;
}): Promise<FrontSuspensionChange> {
  const db = getDatabase();
  const changedOn = input.changedOn.trim();
  const odometerKm = Math.trunc(input.odometerKm);
  const photoUri1 = normalizeOptionalText(input.photoUri1);
  const photoUri2 = normalizeOptionalText(input.photoUri2);

  if (!isFrontSuspensionPartKind(input.partKind)) {
    throw new Error('Tipo de peça da suspensão dianteira inválido.');
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
    `INSERT INTO front_suspension_changes (
      vehicle_id, part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.partKind,
    changedOn,
    odometerKm,
    photoUri1,
    photoUri2,
  );

  const created = await db.getFirstAsync<FrontSuspensionChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM front_suspension_changes
     WHERE id = ?
     LIMIT 1`,
    result.lastInsertRowId,
  );

  if (!created) {
    throw new Error('Não foi possível registrar a troca da suspensão dianteira.');
  }

  return mapRow(created);
}

export async function deleteFrontSuspensionChange(
  id: number,
  vehicleId: number,
): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<FrontSuspensionChangeRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM front_suspension_changes
     WHERE id = ? AND vehicle_id = ?
     LIMIT 1`,
    id,
    vehicleId,
  );

  if (!existing) {
    throw new Error('Não foi possível apagar a troca da suspensão dianteira.');
  }

  const result = await db.runAsync(
    `DELETE FROM front_suspension_changes
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );

  if (result.changes === 0) {
    throw new Error('Não foi possível apagar a troca da suspensão dianteira.');
  }

  deleteFrontSuspensionPhotos([existing.photo_uri_1, existing.photo_uri_2]);
}

export function getNextFrontSuspensionDue(
  changes: FrontSuspensionChange[],
): FrontSuspensionNextDue | null {
  const lastChange = changes[0];
  if (!lastChange) {
    return null;
  }

  const interval = FRONT_SUSPENSION_INTERVALS[lastChange.partKind];
  const nextDueDate = addMonthsClamped(lastChange.changedOn, interval.months);
  const nextDueKm = lastChange.odometerKm + interval.km;

  return {
    lastChange,
    nextDueDate,
    nextDueKm,
    isOverdueByDate: todayLocalIso() > nextDueDate,
  };
}
