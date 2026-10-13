import { BRAKE_PART_KINDS } from '../db/brakeChanges';
import { OIL_TYPES } from '../db/engineOilChanges';
import { FRONT_SUSPENSION_PART_KINDS } from '../db/frontSuspensionChanges';
import {
  OCCURRENCE_MEDIA_EXTENSIONS,
  OCCURRENCE_MEDIA_KINDS,
  OCCURRENCE_MEDIA_PURPOSES,
  type OccurrenceMediaKind,
  type OccurrenceMediaPurpose,
} from '../db/occurrences';
import { REAR_SUSPENSION_PART_KINDS } from '../db/rearSuspensionChanges';
import { normalizePlate } from '../db/vehicles';

const BELT_KINDS = ['timing', 'accessory'] as const;
const AIR_FILTER_KINDS = ['engine', 'cabin'] as const;

export const BACKUP_FORMAT = 'car-services';
export const BACKUP_VERSION = 4;
export const SUPPORTED_BACKUP_VERSIONS = [1, 2, 3, 4] as const;

export type BackupVersion = (typeof SUPPORTED_BACKUP_VERSIONS)[number];

const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

export type BackupPhoto = {
  base64: string;
  extension: string;
};

type BackupRecordBase = {
  changedOn: string;
  odometerKm: number;
  createdAt: string;
  photo1: BackupPhoto | null;
  photo2: BackupPhoto | null;
};

export type BackupEngineOilChange = BackupRecordBase & {
  filterChanged: boolean;
  oilBrand: string | null;
  oilViscosity: string | null;
  oilType: string | null;
};

export type BackupTransmissionOilChange = BackupRecordBase & {
  oilBrand: string | null;
};

export type BackupCoolantChange = BackupRecordBase & {
  flushDone: boolean;
};

export type BackupSparkPlugChange = BackupRecordBase;
export type BackupIgnitionCoilChange = BackupRecordBase;
export type BackupFuelFilterChange = BackupRecordBase;

export type BackupBeltChange = BackupRecordBase & {
  beltKind: string;
};

export type BackupAirFilterChange = BackupRecordBase & {
  filterKind: string;
};

export type BackupFrontSuspensionChange = BackupRecordBase & {
  partKind: string;
};

export type BackupRearSuspensionChange = BackupRecordBase & {
  partKind: string;
};

export type BackupBrakeChange = BackupRecordBase & {
  partKind: string;
};

export type BackupOccurrenceMedia = {
  purpose: OccurrenceMediaPurpose;
  kind: OccurrenceMediaKind;
  createdAt: string;
  file: BackupPhoto;
};

export type BackupOccurrenceUpdate = {
  body: string;
  createdAt: string;
};

export type BackupOccurrence = {
  occurredOn: string;
  title: string;
  updates: BackupOccurrenceUpdate[];
  resolved: boolean;
  resolutionNotes: string | null;
  createdAt: string;
  media: BackupOccurrenceMedia[];
};

export type BackupQuoteItem = {
  name: string;
  link: string | null;
  priceCents: number;
};

export type BackupQuote = {
  name: string;
  storeName: string;
  quotedOn: string;
  approved: boolean;
  createdAt: string;
  items: BackupQuoteItem[];
};

export type BackupVehicle = {
  brand: string;
  model: string;
  plate: string;
  createdAt: string;
  engineOil: BackupEngineOilChange[];
  transmissionOil: BackupTransmissionOilChange[];
  coolant: BackupCoolantChange[];
  sparkPlugs: BackupSparkPlugChange[];
  ignitionCoils: BackupIgnitionCoilChange[];
  belts: BackupBeltChange[];
  fuelFilters: BackupFuelFilterChange[];
  airFilters: BackupAirFilterChange[];
  frontSuspension: BackupFrontSuspensionChange[];
  rearSuspension: BackupRearSuspensionChange[];
  brakes: BackupBrakeChange[];
  occurrences: BackupOccurrence[];
  quotes: BackupQuote[];
};

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: BackupVersion;
  exportedAt: string;
  vehicles: BackupVehicle[];
};

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} está inválido.`);
  }
  return value as Record<string, unknown>;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} é obrigatório.`);
  }
  return value.trim();
}

function requireDate(value: unknown, label: string): string {
  const date = requireText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} está inválida.`);
  }
  return date;
}

function requireTimestamp(value: unknown, label: string): string {
  return requireText(value, label);
}

function requireKm(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} está inválida.`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} está inválido.`);
  }
  return value;
}

function optionalText(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} está inválido.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireEnum(value: unknown, label: string, allowed: readonly string[]): string {
  const text = requireText(value, label);
  if (!allowed.includes(text)) {
    throw new Error(`${label} está inválido.`);
  }
  return text;
}

function optionalEnum(value: unknown, label: string, allowed: readonly string[]): string | null {
  if (value === null) {
    return null;
  }
  return requireEnum(value, label, allowed);
}

function isBackupVersion(value: unknown): value is BackupVersion {
  return (SUPPORTED_BACKUP_VERSIONS as readonly unknown[]).includes(value);
}

function requireCents(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} está inválido.`);
  }
  return value;
}

function parseQuoteItem(value: unknown, label: string): BackupQuoteItem {
  const record = asObject(value, label);
  return {
    name: requireText(record.name, `${label}: nome`),
    link: optionalText(record.link, `${label}: link`),
    priceCents: requireCents(record.priceCents, `${label}: preço`),
  };
}

function parseQuote(value: unknown, label: string): BackupQuote {
  const record = asObject(value, label);
  const items = parseList(record.items, `${label}: itens`, (item, index) =>
    parseQuoteItem(item, `${label}: item ${index + 1}`),
  );
  if (items.length === 0) {
    throw new Error(`${label} precisa de pelo menos um item.`);
  }
  return {
    name: requireText(record.name, `${label}: nome`),
    storeName: requireText(record.storeName, `${label}: loja`),
    quotedOn: requireDate(record.quotedOn, `${label}: data`),
    approved: requireBoolean(record.approved, `${label}: aprovado`),
    createdAt: requireTimestamp(record.createdAt, `${label}: criação`),
    items,
  };
}

function parseMediaFile(value: unknown, label: string, kind: OccurrenceMediaKind): BackupPhoto {
  const file = asObject(value, label);
  if (typeof file.base64 !== 'string' || file.base64.length === 0) {
    throw new Error(`${label} está inválida.`);
  }
  const extension = requireText(file.extension, `${label}: extensão`).toLowerCase();
  const normalized = extension.startsWith('.') ? extension : `.${extension}`;
  if (!OCCURRENCE_MEDIA_EXTENSIONS[kind].includes(normalized)) {
    throw new Error(`${label} tem um formato não suportado.`);
  }
  return { base64: file.base64, extension: normalized };
}

function parseOccurrenceMedia(value: unknown, label: string): BackupOccurrenceMedia {
  const record = asObject(value, label);
  const purpose = requireEnum(
    record.purpose,
    `${label}: finalidade`,
    OCCURRENCE_MEDIA_PURPOSES,
  ) as OccurrenceMediaPurpose;
  const kind = requireEnum(record.kind, `${label}: tipo`, OCCURRENCE_MEDIA_KINDS) as OccurrenceMediaKind;
  return {
    purpose,
    kind,
    createdAt: requireTimestamp(record.createdAt, `${label}: criação`),
    file: parseMediaFile(record.file, label, kind),
  };
}

function parseOccurrenceUpdate(value: unknown, label: string): BackupOccurrenceUpdate {
  const record = asObject(value, label);
  return {
    body: requireText(record.body, `${label}: conteúdo`),
    createdAt: requireTimestamp(record.createdAt, `${label}: criação`),
  };
}

function parseOccurrence(value: unknown, label: string, version: BackupVersion): BackupOccurrence {
  const record = asObject(value, label);
  const resolved = requireBoolean(record.resolved, `${label}: resolvido`);
  const createdAt = requireTimestamp(record.createdAt, `${label}: criação`);
  const media = parseList(record.media, `${label}: mídias`, (item, index) =>
    parseOccurrenceMedia(item, `${label}: mídia ${index + 1}`),
  ).filter((item) => resolved || item.purpose === 'report');
  const updates =
    version >= 3
      ? parseList(record.updates, `${label}: textos`, (item, index) =>
          parseOccurrenceUpdate(item, `${label}: texto ${index + 1}`),
        )
      : (() => {
          const legacyNotes = optionalText(record.notes, `${label}: texto`);
          return legacyNotes ? [{ body: legacyNotes, createdAt }] : [];
        })();

  return {
    occurredOn: requireDate(record.occurredOn, `${label}: data`),
    title: requireText(record.title, `${label}: título`),
    updates,
    resolved,
    resolutionNotes: resolved ? optionalText(record.resolutionNotes, `${label}: solução`) : null,
    createdAt,
    media,
  };
}

function parsePhoto(value: unknown, label: string): BackupPhoto | null {
  if (value === null) {
    return null;
  }
  const photo = asObject(value, label);
  if (typeof photo.base64 !== 'string' || photo.base64.length === 0) {
    throw new Error(`${label} está inválida.`);
  }
  const extension = requireText(photo.extension, `${label}: extensão`).toLowerCase();
  if (!PHOTO_EXTENSIONS.includes(extension)) {
    throw new Error(`${label} tem um formato não suportado.`);
  }
  return { base64: photo.base64, extension };
}

function parseRecordBase(value: unknown, label: string): BackupRecordBase {
  const record = asObject(value, label);
  return {
    changedOn: requireDate(record.changedOn, `${label}: data`),
    odometerKm: requireKm(record.odometerKm, `${label}: quilometragem`),
    createdAt: requireTimestamp(record.createdAt, `${label}: criação`),
    photo1: parsePhoto(record.photo1, `${label}: foto 1`),
    photo2: parsePhoto(record.photo2, `${label}: foto 2`),
  };
}

function parseList<T>(value: unknown, label: string, mapItem: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} está inválido.`);
  }
  return value.map((item, index) => mapItem(item, index));
}

function parseVehicle(value: unknown, index: number, version: BackupVersion): BackupVehicle {
  const label = `Veículo ${index + 1}`;
  const vehicle = asObject(value, label);
  return {
    brand: requireText(vehicle.brand, `${label}: marca`),
    model: requireText(vehicle.model, `${label}: modelo`),
    plate: requireText(vehicle.plate, `${label}: placa`),
    createdAt: requireTimestamp(vehicle.createdAt, `${label}: criação`),
    engineOil: parseList(vehicle.engineOil, `${label}: óleo do motor`, (item, itemIndex) => {
      const record = asObject(item, `${label}: óleo do motor ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: óleo do motor ${itemIndex + 1}`),
        filterChanged: requireBoolean(record.filterChanged, `${label}: filtro de óleo`),
        oilBrand: optionalText(record.oilBrand, `${label}: marca do óleo`),
        oilViscosity: optionalText(record.oilViscosity, `${label}: viscosidade`),
        oilType: optionalEnum(record.oilType, `${label}: tipo de óleo`, OIL_TYPES),
      };
    }),
    transmissionOil: parseList(vehicle.transmissionOil, `${label}: óleo de câmbio`, (item, itemIndex) => {
      const record = asObject(item, `${label}: óleo de câmbio ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: óleo de câmbio ${itemIndex + 1}`),
        oilBrand: optionalText(record.oilBrand, `${label}: marca do óleo de câmbio`),
      };
    }),
    coolant: parseList(vehicle.coolant, `${label}: arrefecimento`, (item, itemIndex) => {
      const record = asObject(item, `${label}: arrefecimento ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: arrefecimento ${itemIndex + 1}`),
        flushDone: requireBoolean(record.flushDone, `${label}: limpeza do arrefecimento`),
      };
    }),
    sparkPlugs: parseList(vehicle.sparkPlugs, `${label}: velas`, (item, itemIndex) =>
      parseRecordBase(item, `${label}: vela ${itemIndex + 1}`),
    ),
    ignitionCoils: parseList(vehicle.ignitionCoils, `${label}: bobinas`, (item, itemIndex) =>
      parseRecordBase(item, `${label}: bobina ${itemIndex + 1}`),
    ),
    belts: parseList(vehicle.belts, `${label}: correias`, (item, itemIndex) => {
      const record = asObject(item, `${label}: correia ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: correia ${itemIndex + 1}`),
        beltKind: requireEnum(record.beltKind, `${label}: tipo de correia`, BELT_KINDS),
      };
    }),
    fuelFilters: parseList(vehicle.fuelFilters, `${label}: filtro de combustível`, (item, itemIndex) =>
      parseRecordBase(item, `${label}: filtro de combustível ${itemIndex + 1}`),
    ),
    airFilters: parseList(vehicle.airFilters, `${label}: filtro de ar`, (item, itemIndex) => {
      const record = asObject(item, `${label}: filtro de ar ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: filtro de ar ${itemIndex + 1}`),
        filterKind: requireEnum(record.filterKind, `${label}: tipo de filtro de ar`, AIR_FILTER_KINDS),
      };
    }),
    frontSuspension: parseList(vehicle.frontSuspension, `${label}: suspensão dianteira`, (item, itemIndex) => {
      const record = asObject(item, `${label}: suspensão dianteira ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: suspensão dianteira ${itemIndex + 1}`),
        partKind: requireEnum(record.partKind, `${label}: peça da suspensão dianteira`, FRONT_SUSPENSION_PART_KINDS),
      };
    }),
    rearSuspension: parseList(vehicle.rearSuspension, `${label}: suspensão traseira`, (item, itemIndex) => {
      const record = asObject(item, `${label}: suspensão traseira ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: suspensão traseira ${itemIndex + 1}`),
        partKind: requireEnum(record.partKind, `${label}: peça da suspensão traseira`, REAR_SUSPENSION_PART_KINDS),
      };
    }),
    brakes: parseList(vehicle.brakes, `${label}: freios`, (item, itemIndex) => {
      const record = asObject(item, `${label}: freio ${itemIndex + 1}`);
      return {
        ...parseRecordBase(record, `${label}: freio ${itemIndex + 1}`),
        partKind: requireEnum(record.partKind, `${label}: peça de freio`, BRAKE_PART_KINDS),
      };
    }),
    occurrences:
      version === 1
        ? []
        : parseList(vehicle.occurrences, `${label}: ocorrências`, (item, itemIndex) =>
            parseOccurrence(item, `${label}: ocorrência ${itemIndex + 1}`, version),
          ),
    quotes:
      version < 4
        ? []
        : parseList(vehicle.quotes, `${label}: orçamentos`, (item, itemIndex) =>
            parseQuote(item, `${label}: orçamento ${itemIndex + 1}`),
          ),
  };
}

export function parseBackup(raw: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }

  const backup = asObject(parsed, 'Arquivo');
  if (backup.format !== BACKUP_FORMAT) {
    throw new Error('Este arquivo não é um backup do Car Services.');
  }
  if (!isBackupVersion(backup.version)) {
    throw new Error('A versão deste backup não é compatível com o app.');
  }

  const version = backup.version;
  const vehicles = parseList(backup.vehicles, 'Lista de veículos', (item, index) =>
    parseVehicle(item, index, version),
  );
  if (vehicles.length === 0) {
    throw new Error('O arquivo não contém veículos.');
  }

  const plates = new Set<string>();
  for (const vehicle of vehicles) {
    const plate = normalizePlate(vehicle.plate);
    if (plates.has(plate)) {
      throw new Error(`A placa ${plate} aparece mais de uma vez no arquivo.`);
    }
    plates.add(plate);
  }

  return {
    format: BACKUP_FORMAT,
    version,
    exportedAt: requireTimestamp(backup.exportedAt, 'Data da exportação'),
    vehicles,
  };
}
