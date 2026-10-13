import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getDatabase } from '../db';
import {
  extensionForOccurrenceMedia,
  type OccurrenceMediaKind,
  type OccurrenceMediaPurpose,
} from '../db/occurrences';
import { listVehicles, normalizePlate } from '../db/vehicles';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupFile,
  type BackupPhoto,
  type BackupVehicle,
} from './schema';

type PhotoRow = {
  photo_uri_1: string | null;
  photo_uri_2: string | null;
  created_at: string;
  changed_on: string;
  odometer_km: number;
};

type OccurrenceExportRow = {
  id: number;
  occurred_on: string;
  title: string;
  resolved: number;
  resolution_notes: string | null;
  created_at: string;
};

type OccurrenceNoteExportRow = {
  occurrence_id: number;
  body: string;
  created_at: string;
};

type OccurrenceMediaExportRow = {
  occurrence_id: number;
  purpose: string;
  kind: string;
  uri: string;
  created_at: string;
};

type QuoteExportRow = {
  id: number;
  name: string;
  store_name: string;
  quoted_on: string;
  approved: number;
  created_at: string;
};

type QuoteItemExportRow = {
  quote_id: number;
  name: string;
  link: string | null;
  price_cents: number;
};

function isOccurrenceKind(value: string): value is OccurrenceMediaKind {
  return value === 'photo' || value === 'audio' || value === 'video';
}

function isOccurrencePurpose(value: string): value is OccurrenceMediaPurpose {
  return value === 'report' || value === 'resolution';
}

async function encodeOccurrenceFile(uri: string, kind: OccurrenceMediaKind): Promise<BackupPhoto | null> {
  const file = new File(uri);
  if (!file.exists) {
    return null;
  }

  return {
    base64: await file.base64(),
    extension: extensionForOccurrenceMedia(file.extension, kind),
  };
}

async function encodePhoto(uri: string | null): Promise<BackupPhoto | null> {
  if (!uri) {
    return null;
  }

  const file = new File(uri);
  if (!file.exists) {
    return null;
  }

  const extension = file.extension && file.extension.startsWith('.') ? file.extension.toLowerCase() : '.jpg';
  return {
    base64: await file.base64(),
    extension,
  };
}

async function encodePhotos(row: PhotoRow) {
  const [photo1, photo2] = await Promise.all([
    encodePhoto(row.photo_uri_1),
    encodePhoto(row.photo_uri_2),
  ]);
  return {
    changedOn: row.changed_on,
    odometerKm: row.odometer_km,
    createdAt: row.created_at,
    photo1,
    photo2,
  };
}

async function exportVehicle(vehicleId: number, brand: string, model: string, plate: string, createdAt: string): Promise<BackupVehicle> {
  const db = getDatabase();

  const [
    engineOil,
    transmissionOil,
    coolant,
    sparkPlugs,
    ignitionCoils,
    belts,
    fuelFilters,
    airFilters,
    frontSuspension,
    rearSuspension,
    brakes,
    occurrences,
    occurrenceNotes,
    occurrenceMedia,
    quotes,
    quoteItems,
  ] = await Promise.all([
    db.getAllAsync<
      PhotoRow & {
        filter_changed: number;
        oil_brand: string | null;
        oil_viscosity: string | null;
        oil_type: string | null;
      }
    >(
      `SELECT changed_on, odometer_km, filter_changed, oil_brand, oil_viscosity, oil_type,
              photo_uri_1, photo_uri_2, created_at
       FROM engine_oil_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { oil_brand: string | null }>(
      `SELECT changed_on, odometer_km, oil_brand, photo_uri_1, photo_uri_2, created_at
       FROM transmission_oil_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { flush_done: number }>(
      `SELECT changed_on, odometer_km, flush_done, photo_uri_1, photo_uri_2, created_at
       FROM coolant_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow>(
      `SELECT changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM spark_plug_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow>(
      `SELECT changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM ignition_coil_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { belt_kind: string }>(
      `SELECT belt_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM belt_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow>(
      `SELECT changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM fuel_filter_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { filter_kind: string }>(
      `SELECT filter_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM air_filter_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { part_kind: string }>(
      `SELECT part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM front_suspension_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { part_kind: string }>(
      `SELECT part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM rear_suspension_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<PhotoRow & { part_kind: string }>(
      `SELECT part_kind, changed_on, odometer_km, photo_uri_1, photo_uri_2, created_at
       FROM brake_changes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<OccurrenceExportRow>(
      `SELECT id, occurred_on, title, resolved, resolution_notes, created_at
       FROM occurrences WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<OccurrenceNoteExportRow>(
      `SELECT occurrence_notes.occurrence_id, occurrence_notes.body, occurrence_notes.created_at
       FROM occurrence_notes
       INNER JOIN occurrences ON occurrences.id = occurrence_notes.occurrence_id
       WHERE occurrences.vehicle_id = ?
       ORDER BY occurrence_notes.id ASC`,
      vehicleId,
    ),
    db.getAllAsync<OccurrenceMediaExportRow>(
      `SELECT occurrence_media.occurrence_id, occurrence_media.purpose, occurrence_media.kind,
              occurrence_media.uri, occurrence_media.created_at
       FROM occurrence_media
       INNER JOIN occurrences ON occurrences.id = occurrence_media.occurrence_id
       WHERE occurrences.vehicle_id = ?
       ORDER BY occurrence_media.id ASC`,
      vehicleId,
    ),
    db.getAllAsync<QuoteExportRow>(
      `SELECT id, name, store_name, quoted_on, approved, created_at
       FROM quotes WHERE vehicle_id = ? ORDER BY id ASC`,
      vehicleId,
    ),
    db.getAllAsync<QuoteItemExportRow>(
      `SELECT quote_items.quote_id, quote_items.name, quote_items.link, quote_items.price_cents
       FROM quote_items
       INNER JOIN quotes ON quotes.id = quote_items.quote_id
       WHERE quotes.vehicle_id = ?
       ORDER BY quote_items.position ASC, quote_items.id ASC`,
      vehicleId,
    ),
  ]);

  return {
    brand,
    model,
    plate: normalizePlate(plate),
    createdAt,
    engineOil: await Promise.all(
      engineOil.map(async (row) => ({
        ...(await encodePhotos(row)),
        filterChanged: row.filter_changed === 1,
        oilBrand: row.oil_brand,
        oilViscosity: row.oil_viscosity,
        oilType: row.oil_type,
      })),
    ),
    transmissionOil: await Promise.all(
      transmissionOil.map(async (row) => ({
        ...(await encodePhotos(row)),
        oilBrand: row.oil_brand,
      })),
    ),
    coolant: await Promise.all(
      coolant.map(async (row) => ({
        ...(await encodePhotos(row)),
        flushDone: row.flush_done === 1,
      })),
    ),
    sparkPlugs: await Promise.all(sparkPlugs.map((row) => encodePhotos(row))),
    ignitionCoils: await Promise.all(ignitionCoils.map((row) => encodePhotos(row))),
    belts: await Promise.all(
      belts.map(async (row) => ({
        ...(await encodePhotos(row)),
        beltKind: row.belt_kind,
      })),
    ),
    fuelFilters: await Promise.all(fuelFilters.map((row) => encodePhotos(row))),
    airFilters: await Promise.all(
      airFilters.map(async (row) => ({
        ...(await encodePhotos(row)),
        filterKind: row.filter_kind,
      })),
    ),
    frontSuspension: await Promise.all(
      frontSuspension.map(async (row) => ({
        ...(await encodePhotos(row)),
        partKind: row.part_kind,
      })),
    ),
    rearSuspension: await Promise.all(
      rearSuspension.map(async (row) => ({
        ...(await encodePhotos(row)),
        partKind: row.part_kind,
      })),
    ),
    brakes: await Promise.all(
      brakes.map(async (row) => ({
        ...(await encodePhotos(row)),
        partKind: row.part_kind,
      })),
    ),
    occurrences: await Promise.all(
      occurrences.map(async (row) => {
        const resolved = row.resolved === 1;
        const media = await Promise.all(
          occurrenceMedia
            .filter((item) => item.occurrence_id === row.id)
            .filter((item) => isOccurrenceKind(item.kind) && isOccurrencePurpose(item.purpose))
            .filter((item) => resolved || item.purpose === 'report')
            .map(async (item) => {
              if (!isOccurrenceKind(item.kind) || !isOccurrencePurpose(item.purpose)) {
                return null;
              }
              const file = await encodeOccurrenceFile(item.uri, item.kind);
              if (!file) {
                return null;
              }
              return {
                purpose: item.purpose,
                kind: item.kind,
                createdAt: item.created_at,
                file,
              };
            }),
        );

        return {
          occurredOn: row.occurred_on,
          title: row.title,
          updates: occurrenceNotes
            .filter((item) => item.occurrence_id === row.id)
            .map((item) => ({
              body: item.body,
              createdAt: item.created_at,
            })),
          resolved,
          resolutionNotes: resolved ? row.resolution_notes : null,
          createdAt: row.created_at,
          media: media.filter((item) => item !== null),
        };
      }),
    ),
    quotes: quotes.map((row) => ({
      name: row.name,
      storeName: row.store_name,
      quotedOn: row.quoted_on,
      approved: row.approved === 1,
      createdAt: row.created_at,
      items: quoteItems
        .filter((item) => item.quote_id === row.id)
        .map((item) => ({
          name: item.name,
          link: item.link,
          priceCents: item.price_cents,
        })),
    })),
  };
}

function dateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function exportBackup(vehicleId?: number): Promise<{
  uri: string;
  filename: string;
  contents: string;
}> {
  const vehicles = await listVehicles();
  const selected = vehicleId === undefined ? vehicles : vehicles.filter((vehicle) => vehicle.id === vehicleId);
  if (vehicleId !== undefined && selected.length === 0) {
    throw new Error('Veículo não encontrado.');
  }
  if (selected.length === 0) {
    throw new Error('Não há veículos para exportar.');
  }

  const exportedAt = new Date();
  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    vehicles: await Promise.all(
      selected.map((vehicle) =>
        exportVehicle(vehicle.id, vehicle.brand, vehicle.model, vehicle.plate, vehicle.createdAt),
      ),
    ),
  };

  const filename =
    vehicleId === undefined
      ? `car-services-todos-${dateStamp(exportedAt)}.json`
      : `car-services-${normalizePlate(selected[0].plate)}-${dateStamp(exportedAt)}.json`;
  const contents = JSON.stringify(backup);
  if (Platform.OS === 'web') {
    return { uri: '', filename, contents };
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(contents);
  return { uri: file.uri, filename, contents };
}
