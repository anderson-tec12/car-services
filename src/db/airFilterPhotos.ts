import { Directory, File, Paths } from 'expo-file-system';

const AIR_FILTER_PHOTOS_DIR = 'air-filter-photos';

function ensureAirFilterPhotosDir(): Directory {
  const dir = new Directory(Paths.document, AIR_FILTER_PHOTOS_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function guessExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (!match) {
    return '.jpg';
  }
  return `.${match[1].toLowerCase()}`;
}

export async function persistAirFilterPhoto(sourceUri: string): Promise<string> {
  const dir = ensureAirFilterPhotosDir();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${guessExtension(sourceUri)}`;
  const destination = new File(dir, name);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

export function deleteAirFilterPhoto(uri: string | null | undefined): void {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Failed to delete air filter photo', error);
  }
}

export function deleteAirFilterPhotos(uris: (string | null | undefined)[]): void {
  for (const uri of uris) {
    deleteAirFilterPhoto(uri);
  }
}
