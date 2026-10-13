import { Directory, File, Paths } from 'expo-file-system';

import { todayLocalIso } from './engineOilChanges';
import { getDatabase } from './index';

const MEDIA_DIR = 'occurrence-media';

export const OCCURRENCE_MEDIA_KINDS = ['photo', 'audio', 'video'] as const;
export const OCCURRENCE_MEDIA_PURPOSES = ['report', 'resolution'] as const;

export type OccurrenceMediaKind = (typeof OCCURRENCE_MEDIA_KINDS)[number];
export type OccurrenceMediaPurpose = (typeof OCCURRENCE_MEDIA_PURPOSES)[number];

export const OCCURRENCE_MEDIA_EXTENSIONS: Record<OccurrenceMediaKind, readonly string[]> = {
  photo: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  audio: ['.m4a', '.mp3', '.wav', '.aac', '.caf', '.ogg', '.webm', '.3gp'],
  video: ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.3gp'],
};

const DEFAULT_EXTENSION: Record<OccurrenceMediaKind, string> = {
  photo: '.jpg',
  audio: '.m4a',
  video: '.mp4',
};

export type OccurrenceSummary = {
  id: number;
  vehicleId: number;
  occurredOn: string;
  title: string;
  resolved: boolean;
  createdAt: string;
};

export type OccurrenceMedia = {
  id: number;
  occurrenceId: number;
  purpose: OccurrenceMediaPurpose;
  kind: OccurrenceMediaKind;
  uri: string;
  createdAt: string;
};

export type OccurrenceNote = {
  id: number;
  occurrenceId: number;
  body: string;
  createdAt: string;
};

export type Occurrence = OccurrenceSummary & {
  notes: OccurrenceNote[];
  resolutionNotes: string | null;
  media: OccurrenceMedia[];
};

export type OccurrenceMediaInput = {
  id: number | null;
  purpose: OccurrenceMediaPurpose;
  kind: OccurrenceMediaKind;
  uri: string;
};

export type OccurrenceNoteInput = {
  id: number | null;
  body: string;
};

export type SaveOccurrenceInput = {
  id?: number;
  vehicleId: number;
  occurredOn: string;
  title: string;
  notes: OccurrenceNoteInput[];
  resolved: boolean;
  resolutionNotes: string | null;
  media: OccurrenceMediaInput[];
};

type OccurrenceRow = {
  id: number;
  vehicle_id: number;
  occurred_on: string;
  title: string;
  resolved: number;
  resolution_notes: string | null;
  created_at: string;
};

type OccurrenceNoteRow = {
  id: number;
  occurrence_id: number;
  body: string;
  created_at: string;
};

type OccurrenceMediaRow = {
  id: number;
  occurrence_id: number;
  purpose: string;
  kind: string;
  uri: string;
  created_at: string;
};

function isMediaKind(value: string): value is OccurrenceMediaKind {
  return (OCCURRENCE_MEDIA_KINDS as readonly string[]).includes(value);
}

function isMediaPurpose(value: string): value is OccurrenceMediaPurpose {
  return (OCCURRENCE_MEDIA_PURPOSES as readonly string[]).includes(value);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function extensionForKind(extension: string | null | undefined, kind: OccurrenceMediaKind): string {
  const normalized = extension
    ? extension.startsWith('.')
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`
    : '';
  if (OCCURRENCE_MEDIA_EXTENSIONS[kind].includes(normalized)) {
    return normalized;
  }
  return DEFAULT_EXTENSION[kind];
}

export function extensionForOccurrenceMedia(
  extension: string | null | undefined,
  kind: OccurrenceMediaKind,
): string {
  return extensionForKind(extension, kind);
}

function ensureMediaDir(): Directory {
  const dir = new Directory(Paths.document, MEDIA_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function guessExtension(uri: string, kind: OccurrenceMediaKind): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return extensionForKind(match ? `.${match[1]}` : null, kind);
}

export async function persistOccurrenceFile(
  sourceUri: string,
  kind: OccurrenceMediaKind,
): Promise<string> {
  const dir = ensureMediaDir();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${guessExtension(sourceUri, kind)}`;
  const destination = new File(dir, name);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

export function deleteOccurrenceFile(uri: string | null | undefined): void {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Failed to delete occurrence media', error);
  }
}

function mapSummary(row: OccurrenceRow): OccurrenceSummary {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    occurredOn: row.occurred_on,
    title: row.title,
    resolved: row.resolved === 1,
    createdAt: row.created_at,
  };
}

function mapNote(row: OccurrenceNoteRow): OccurrenceNote {
  return {
    id: row.id,
    occurrenceId: row.occurrence_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapMedia(row: OccurrenceMediaRow): OccurrenceMedia {
  if (!isMediaPurpose(row.purpose) || !isMediaKind(row.kind)) {
    throw new Error('Mídia da ocorrência está inválida.');
  }

  return {
    id: row.id,
    occurrenceId: row.occurrence_id,
    purpose: row.purpose,
    kind: row.kind,
    uri: row.uri,
    createdAt: row.created_at,
  };
}

function normalizeNotes(notes: OccurrenceNoteInput[]): OccurrenceNoteInput[] {
  return notes.flatMap((note) => {
    const body = note.body.trim();
    if (body.length === 0) {
      return [];
    }
    return [{ id: note.id, body }];
  });
}

function validateOccurrenceInput(input: SaveOccurrenceInput): {
  occurredOn: string;
  title: string;
  notes: OccurrenceNoteInput[];
  resolutionNotes: string | null;
  media: OccurrenceMediaInput[];
} {
  const occurredOn = input.occurredOn.trim();
  const title = input.title.trim();
  const notes = normalizeNotes(input.notes);
  const resolutionNotes = input.resolved ? normalizeOptionalText(input.resolutionNotes) : null;
  const media = input.resolved
    ? input.media
    : input.media.filter((item) => item.purpose === 'report');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    throw new Error('Data inválida.');
  }

  if (occurredOn > todayLocalIso()) {
    throw new Error('A data não pode ser futura.');
  }

  if (title.length === 0) {
    throw new Error('Informe o título.');
  }

  for (const item of media) {
    if (!isMediaKind(item.kind) || !isMediaPurpose(item.purpose) || item.uri.trim().length === 0) {
      throw new Error('Mídia da ocorrência está inválida.');
    }
  }

  return { occurredOn, title, notes, resolutionNotes, media };
}

export async function listOccurrences(vehicleId: number): Promise<OccurrenceSummary[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<OccurrenceRow>(
    `SELECT id, vehicle_id, occurred_on, title, resolved, resolution_notes, created_at
     FROM occurrences
     WHERE vehicle_id = ?
     ORDER BY occurred_on DESC, id DESC`,
    vehicleId,
  );
  return rows.map(mapSummary);
}

export async function getOccurrence(id: number, vehicleId: number): Promise<Occurrence | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<OccurrenceRow>(
    `SELECT id, vehicle_id, occurred_on, title, resolved, resolution_notes, created_at
     FROM occurrences
     WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId,
  );
  if (!row) {
    return null;
  }

  const [mediaRows, noteRows] = await Promise.all([
    db.getAllAsync<OccurrenceMediaRow>(
      `SELECT id, occurrence_id, purpose, kind, uri, created_at
       FROM occurrence_media
       WHERE occurrence_id = ?
       ORDER BY id ASC`,
      id,
    ),
    db.getAllAsync<OccurrenceNoteRow>(
      `SELECT id, occurrence_id, body, created_at
       FROM occurrence_notes
       WHERE occurrence_id = ?
       ORDER BY id ASC`,
      id,
    ),
  ]);

  return {
    ...mapSummary(row),
    notes: noteRows.map(mapNote),
    resolutionNotes: row.resolution_notes,
    media: mediaRows.map(mapMedia),
  };
}

export async function saveOccurrence(input: SaveOccurrenceInput): Promise<number> {
  const validated = validateOccurrenceInput(input);
  const db = getDatabase();
  const filesToDelete = new Set<string>();

  if (!input.resolved) {
    for (const item of input.media) {
      if (item.purpose === 'resolution') {
        filesToDelete.add(item.uri);
      }
    }
  }

  let occurrenceId = input.id ?? 0;

  await db.withTransactionAsync(async () => {
    let id = input.id;

    if (id == null) {
      if (input.media.some((item) => item.id != null)) {
        throw new Error('Mídia da ocorrência está inválida.');
      }

      if (validated.notes.some((note) => note.id != null)) {
        throw new Error('Texto da ocorrência está inválido.');
      }

      const inserted = await db.runAsync(
        `INSERT INTO occurrences (
          vehicle_id, occurred_on, title, notes, resolved, resolution_notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        input.vehicleId,
        validated.occurredOn,
        validated.title,
        null,
        input.resolved ? 1 : 0,
        validated.resolutionNotes,
      );
      id = inserted.lastInsertRowId;
    } else {
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM occurrences WHERE id = ? AND vehicle_id = ?',
        id,
        input.vehicleId,
      );
      if (!existing) {
        throw new Error('Ocorrência não encontrada.');
      }

      await db.runAsync(
        `UPDATE occurrences
         SET occurred_on = ?, title = ?, notes = NULL, resolved = ?, resolution_notes = ?
         WHERE id = ? AND vehicle_id = ?`,
        validated.occurredOn,
        validated.title,
        input.resolved ? 1 : 0,
        validated.resolutionNotes,
        id,
        input.vehicleId,
      );

      const currentNotes = await db.getAllAsync<{ id: number }>(
        'SELECT id FROM occurrence_notes WHERE occurrence_id = ?',
        id,
      );
      const currentNoteIds = new Set(currentNotes.map((note) => note.id));
      for (const note of validated.notes) {
        if (note.id != null && !currentNoteIds.has(note.id)) {
          throw new Error('Texto da ocorrência está inválido.');
        }
      }

      const currentMedia = await db.getAllAsync<{ id: number; uri: string }>(
        'SELECT id, uri FROM occurrence_media WHERE occurrence_id = ?',
        id,
      );
      const currentIds = new Set(currentMedia.map((item) => item.id));
      for (const item of validated.media) {
        if (item.id != null && !currentIds.has(item.id)) {
          throw new Error('Mídia da ocorrência está inválida.');
        }
      }

      const keptIds = new Set(
        validated.media.flatMap((item) => (item.id == null ? [] : [item.id])),
      );
      for (const item of currentMedia) {
        if (!keptIds.has(item.id)) {
          filesToDelete.add(item.uri);
          await db.runAsync('DELETE FROM occurrence_media WHERE id = ? AND occurrence_id = ?', item.id, id);
        }
      }
    }

    if (id == null) {
      throw new Error('Não foi possível salvar a ocorrência.');
    }

    for (const item of validated.media) {
      if (item.id != null) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO occurrence_media (occurrence_id, purpose, kind, uri)
         VALUES (?, ?, ?, ?)`,
        id,
        item.purpose,
        item.kind,
        item.uri,
      );
    }

    for (const note of validated.notes) {
      if (note.id != null) {
        continue;
      }
      await db.runAsync(
        'INSERT INTO occurrence_notes (occurrence_id, body) VALUES (?, ?)',
        id,
        note.body,
      );
    }

    occurrenceId = id;
  });

  for (const uri of filesToDelete) {
    const stillUsed = validated.media.some((item) => item.uri === uri && item.id != null);
    if (!stillUsed) {
      deleteOccurrenceFile(uri);
    }
  }

  return occurrenceId;
}

export async function deleteOccurrence(id: number, vehicleId: number): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM occurrences WHERE id = ? AND vehicle_id = ?',
    id,
    vehicleId,
  );
  if (!existing) {
    throw new Error('Ocorrência não encontrada.');
  }

  const media = await db.getAllAsync<{ uri: string }>(
    'SELECT uri FROM occurrence_media WHERE occurrence_id = ?',
    id,
  );

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM occurrence_notes WHERE occurrence_id = ?', id);
    await db.runAsync('DELETE FROM occurrence_media WHERE occurrence_id = ?', id);
    await db.runAsync('DELETE FROM occurrences WHERE id = ? AND vehicle_id = ?', id, vehicleId);
  });

  for (const item of media) {
    deleteOccurrenceFile(item.uri);
  }
}
