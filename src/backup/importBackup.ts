import { EncodingType, File, Paths } from 'expo-file-system';

import { getDatabase } from '../db';
import { persistAirFilterPhoto } from '../db/airFilterPhotos';
import { persistBeltPhoto } from '../db/beltPhotos';
import { persistBrakePhoto } from '../db/brakePhotos';
import { persistCoolantPhoto } from '../db/coolantPhotos';
import { persistFuelFilterPhoto } from '../db/fuelFilterPhotos';
import { persistFrontSuspensionPhoto } from '../db/frontSuspensionPhotos';
import { persistIgnitionCoilPhoto } from '../db/ignitionCoilPhotos';
import { persistOilPhoto } from '../db/oilPhotos';
import { persistOccurrenceFile } from '../db/occurrences';
import { persistRearSuspensionPhoto } from '../db/rearSuspensionPhotos';
import { persistSparkPlugPhoto } from '../db/sparkPlugPhotos';
import { persistTransmissionOilPhoto } from '../db/transmissionOilPhotos';
import { normalizePlate } from '../db/vehicles';
import { parseBackup, type BackupFile, type BackupPhoto, type BackupQuote, type BackupVehicle } from './schema';

export type ImportPreview = {
  backup: BackupFile;
  replacements: string[];
  additions: string[];
};

type PhotoUris = {
  photoUri1: string | null;
  photoUri2: string | null;
};

const MAINTENANCE_TABLES = [
  'engine_oil_changes',
  'transmission_oil_changes',
  'coolant_changes',
  'spark_plug_changes',
  'ignition_coil_changes',
  'belt_changes',
  'fuel_filter_changes',
  'air_filter_changes',
  'front_suspension_changes',
  'rear_suspension_changes',
  'brake_changes',
] as const;

let photoSerial = 0;

async function materializePhoto(
  photo: BackupPhoto | null,
  persist: (sourceUri: string) => Promise<string>,
  staged: string[],
): Promise<string | null> {
  if (!photo) {
    return null;
  }

  photoSerial += 1;
  const temp = new File(Paths.cache, `import-photo-${Date.now()}-${photoSerial}${photo.extension}`);
  temp.create();
  temp.write(photo.base64, { encoding: EncodingType.Base64 });
  try {
    const uri = await persist(temp.uri);
    staged.push(uri);
    return uri;
  } finally {
    if (temp.exists) {
      temp.delete();
    }
  }
}

async function materializePair(
  photo1: BackupPhoto | null,
  photo2: BackupPhoto | null,
  persist: (sourceUri: string) => Promise<string>,
  staged: string[],
): Promise<PhotoUris> {
  return {
    photoUri1: await materializePhoto(photo1, persist, staged),
    photoUri2: await materializePhoto(photo2, persist, staged),
  };
}

type PreparedVehicle = {
  brand: string;
  model: string;
  plate: string;
  createdAt: string;
  engineOil: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    filterChanged: boolean;
    oilBrand: string | null;
    oilViscosity: string | null;
    oilType: string | null;
  })[];
  transmissionOil: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    oilBrand: string | null;
  })[];
  coolant: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    flushDone: boolean;
  })[];
  sparkPlugs: (PhotoUris & { changedOn: string; odometerKm: number; createdAt: string })[];
  ignitionCoils: (PhotoUris & { changedOn: string; odometerKm: number; createdAt: string })[];
  belts: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    beltKind: string;
  })[];
  fuelFilters: (PhotoUris & { changedOn: string; odometerKm: number; createdAt: string })[];
  airFilters: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    filterKind: string;
  })[];
  frontSuspension: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    partKind: string;
  })[];
  rearSuspension: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    partKind: string;
  })[];
  brakes: (PhotoUris & {
    changedOn: string;
    odometerKm: number;
    createdAt: string;
    partKind: string;
  })[];
  occurrences: {
    occurredOn: string;
    title: string;
    updates: {
      body: string;
      createdAt: string;
    }[];
    resolved: boolean;
    resolutionNotes: string | null;
    createdAt: string;
    media: {
      purpose: string;
      kind: string;
      uri: string;
      createdAt: string;
    }[];
  }[];
  quotes: BackupQuote[];
};

async function prepareVehicle(vehicle: BackupVehicle, staged: string[]): Promise<PreparedVehicle> {
  return {
    brand: vehicle.brand.trim(),
    model: vehicle.model.trim(),
    plate: normalizePlate(vehicle.plate),
    createdAt: vehicle.createdAt,
    engineOil: await Promise.all(
      vehicle.engineOil.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        filterChanged: record.filterChanged,
        oilBrand: record.oilBrand,
        oilViscosity: record.oilViscosity,
        oilType: record.oilType,
        ...(await materializePair(record.photo1, record.photo2, persistOilPhoto, staged)),
      })),
    ),
    transmissionOil: await Promise.all(
      vehicle.transmissionOil.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        oilBrand: record.oilBrand,
        ...(await materializePair(record.photo1, record.photo2, persistTransmissionOilPhoto, staged)),
      })),
    ),
    coolant: await Promise.all(
      vehicle.coolant.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        flushDone: record.flushDone,
        ...(await materializePair(record.photo1, record.photo2, persistCoolantPhoto, staged)),
      })),
    ),
    sparkPlugs: await Promise.all(
      vehicle.sparkPlugs.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        ...(await materializePair(record.photo1, record.photo2, persistSparkPlugPhoto, staged)),
      })),
    ),
    ignitionCoils: await Promise.all(
      vehicle.ignitionCoils.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        ...(await materializePair(record.photo1, record.photo2, persistIgnitionCoilPhoto, staged)),
      })),
    ),
    belts: await Promise.all(
      vehicle.belts.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        beltKind: record.beltKind,
        ...(await materializePair(record.photo1, record.photo2, persistBeltPhoto, staged)),
      })),
    ),
    fuelFilters: await Promise.all(
      vehicle.fuelFilters.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        ...(await materializePair(record.photo1, record.photo2, persistFuelFilterPhoto, staged)),
      })),
    ),
    airFilters: await Promise.all(
      vehicle.airFilters.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        filterKind: record.filterKind,
        ...(await materializePair(record.photo1, record.photo2, persistAirFilterPhoto, staged)),
      })),
    ),
    frontSuspension: await Promise.all(
      vehicle.frontSuspension.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        partKind: record.partKind,
        ...(await materializePair(record.photo1, record.photo2, persistFrontSuspensionPhoto, staged)),
      })),
    ),
    rearSuspension: await Promise.all(
      vehicle.rearSuspension.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        partKind: record.partKind,
        ...(await materializePair(record.photo1, record.photo2, persistRearSuspensionPhoto, staged)),
      })),
    ),
    brakes: await Promise.all(
      vehicle.brakes.map(async (record) => ({
        changedOn: record.changedOn,
        odometerKm: record.odometerKm,
        createdAt: record.createdAt,
        partKind: record.partKind,
        ...(await materializePair(record.photo1, record.photo2, persistBrakePhoto, staged)),
      })),
    ),
    occurrences: await Promise.all(
      vehicle.occurrences.map(async (record) => ({
        occurredOn: record.occurredOn,
        title: record.title,
        updates: record.updates,
        resolved: record.resolved,
        resolutionNotes: record.resolved ? record.resolutionNotes : null,
        createdAt: record.createdAt,
        media: await Promise.all(
          record.media
            .filter((item) => record.resolved || item.purpose === 'report')
            .map(async (item) => {
              const uri = await materializePhoto(
                item.file,
                (sourceUri) => persistOccurrenceFile(sourceUri, item.kind),
                staged,
              );
              if (!uri) {
                throw new Error('Não foi possível restaurar uma mídia da ocorrência.');
              }
              return {
                purpose: item.purpose,
                kind: item.kind,
                uri,
                createdAt: item.createdAt,
              };
            }),
        ),
      })),
    ),
    quotes: vehicle.quotes,
  };
}

function discardPhotos(uris: string[]): void {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error('Failed to delete backup photo', error);
    }
  }
}

export async function previewImport(raw: string): Promise<ImportPreview> {
  const backup = parseBackup(raw);
  const db = getDatabase();
  const replacements: string[] = [];
  const additions: string[] = [];

  for (const vehicle of backup.vehicles) {
    const plate = normalizePlate(vehicle.plate);
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM vehicles WHERE plate = ? LIMIT 1',
      plate,
    );
    if (existing) {
      replacements.push(plate);
    } else {
      additions.push(plate);
    }
  }

  return { backup, replacements, additions };
}

export async function applyImport(backup: BackupFile): Promise<void> {
  const staged: string[] = [];
  const removed: string[] = [];

  try {
    const prepared: PreparedVehicle[] = [];
    for (const vehicle of backup.vehicles) {
      prepared.push(await prepareVehicle(vehicle, staged));
    }

    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      let firstInsertedId: number | null = null;

      for (const vehicle of prepared) {
        const existing = await db.getFirstAsync<{ id: number; is_active: number }>(
          'SELECT id, is_active FROM vehicles WHERE plate = ? LIMIT 1',
          vehicle.plate,
        );
        const wasActive = existing?.is_active === 1;

        if (existing) {
          const occurrenceMedia = await db.getAllAsync<{ uri: string }>(
            `SELECT occurrence_media.uri AS uri
             FROM occurrence_media
             INNER JOIN occurrences ON occurrences.id = occurrence_media.occurrence_id
             WHERE occurrences.vehicle_id = ?`,
            existing.id,
          );
          for (const row of occurrenceMedia) {
            if (row.uri) {
              removed.push(row.uri);
            }
          }
          await db.runAsync(
            `DELETE FROM occurrence_media
             WHERE occurrence_id IN (SELECT id FROM occurrences WHERE vehicle_id = ?)`,
            existing.id,
          );
          await db.runAsync('DELETE FROM occurrences WHERE vehicle_id = ?', existing.id);
          await db.runAsync(
            `DELETE FROM quote_items
             WHERE quote_id IN (SELECT id FROM quotes WHERE vehicle_id = ?)`,
            existing.id,
          );
          await db.runAsync('DELETE FROM quotes WHERE vehicle_id = ?', existing.id);

          for (const table of MAINTENANCE_TABLES) {
            const rows = await db.getAllAsync<{ photo_uri_1: string | null; photo_uri_2: string | null }>(
              `SELECT photo_uri_1, photo_uri_2 FROM ${table} WHERE vehicle_id = ?`,
              existing.id,
            );
            for (const row of rows) {
              if (row.photo_uri_1) {
                removed.push(row.photo_uri_1);
              }
              if (row.photo_uri_2) {
                removed.push(row.photo_uri_2);
              }
            }
            await db.runAsync(`DELETE FROM ${table} WHERE vehicle_id = ?`, existing.id);
          }
          await db.runAsync('DELETE FROM vehicles WHERE id = ?', existing.id);
        }

        const inserted = await db.runAsync(
          'INSERT INTO vehicles (brand, model, plate, is_active, created_at) VALUES (?, ?, ?, ?, ?)',
          vehicle.brand,
          vehicle.model,
          vehicle.plate,
          wasActive ? 1 : 0,
          vehicle.createdAt,
        );
        const vehicleId = inserted.lastInsertRowId;
        if (firstInsertedId === null) {
          firstInsertedId = vehicleId;
        }

        for (const record of vehicle.engineOil) {
          await db.runAsync(
            `INSERT INTO engine_oil_changes (
              vehicle_id, changed_on, odometer_km, filter_changed,
              oil_brand, oil_viscosity, oil_type, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.changedOn,
            record.odometerKm,
            record.filterChanged ? 1 : 0,
            record.oilBrand,
            record.oilViscosity,
            record.oilType,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.transmissionOil) {
          await db.runAsync(
            `INSERT INTO transmission_oil_changes (
              vehicle_id, changed_on, odometer_km, oil_brand, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.changedOn,
            record.odometerKm,
            record.oilBrand,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.coolant) {
          await db.runAsync(
            `INSERT INTO coolant_changes (
              vehicle_id, changed_on, odometer_km, flush_done, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.changedOn,
            record.odometerKm,
            record.flushDone ? 1 : 0,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.sparkPlugs) {
          await db.runAsync(
            `INSERT INTO spark_plug_changes (
              vehicle_id, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.ignitionCoils) {
          await db.runAsync(
            `INSERT INTO ignition_coil_changes (
              vehicle_id, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.belts) {
          await db.runAsync(
            `INSERT INTO belt_changes (
              vehicle_id, belt_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.beltKind,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.fuelFilters) {
          await db.runAsync(
            `INSERT INTO fuel_filter_changes (
              vehicle_id, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.airFilters) {
          await db.runAsync(
            `INSERT INTO air_filter_changes (
              vehicle_id, filter_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.filterKind,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.frontSuspension) {
          await db.runAsync(
            `INSERT INTO front_suspension_changes (
              vehicle_id, part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.partKind,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.rearSuspension) {
          await db.runAsync(
            `INSERT INTO rear_suspension_changes (
              vehicle_id, part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.partKind,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.brakes) {
          await db.runAsync(
            `INSERT INTO brake_changes (
              vehicle_id, part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.partKind,
            record.changedOn,
            record.odometerKm,
            record.photoUri1,
            record.photoUri2,
            record.createdAt,
          );
        }

        for (const record of vehicle.occurrences) {
          const insertedOccurrence = await db.runAsync(
            `INSERT INTO occurrences (
              vehicle_id, occurred_on, title, notes, resolved, resolution_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.occurredOn,
            record.title,
            null,
            record.resolved ? 1 : 0,
            record.resolved ? record.resolutionNotes : null,
            record.createdAt,
          );
          for (const update of record.updates) {
            await db.runAsync(
              `INSERT INTO occurrence_notes (occurrence_id, body, created_at)
               VALUES (?, ?, ?)`,
              insertedOccurrence.lastInsertRowId,
              update.body,
              update.createdAt,
            );
          }
          for (const media of record.media) {
            await db.runAsync(
              `INSERT INTO occurrence_media (occurrence_id, purpose, kind, uri, created_at)
               VALUES (?, ?, ?, ?, ?)`,
              insertedOccurrence.lastInsertRowId,
              media.purpose,
              media.kind,
              media.uri,
              media.createdAt,
            );
          }
        }

        for (const record of vehicle.quotes) {
          const insertedQuote = await db.runAsync(
            `INSERT INTO quotes (vehicle_id, name, store_name, quoted_on, approved, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            vehicleId,
            record.name,
            record.storeName,
            record.quotedOn,
            record.approved ? 1 : 0,
            record.createdAt,
          );
          for (const [position, item] of record.items.entries()) {
            await db.runAsync(
              `INSERT INTO quote_items (quote_id, name, link, price_cents, position)
               VALUES (?, ?, ?, ?, ?)`,
              insertedQuote.lastInsertRowId,
              item.name,
              item.link,
              item.priceCents,
              position,
            );
          }
        }
      }

      const active = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM vehicles WHERE is_active = 1 LIMIT 1',
      );
      if (!active && firstInsertedId !== null) {
        await db.runAsync('UPDATE vehicles SET is_active = 1 WHERE id = ?', firstInsertedId);
      }
    });

    discardPhotos(removed);
  } catch (error) {
    discardPhotos(staged);
    throw error;
  }
}
