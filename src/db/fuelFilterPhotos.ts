import { Directory, File, Paths } from 'expo-file-system';

const FUEL_FILTER_PHOTOS_DIR = 'fuel-filter-photos';

function ensureFuelFilterPhotosDir(): Directory {
  const dir = new Directory(Paths.document, FUEL_FILTER_PHOTOS_DIR);
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

export async function persistFuelFilterPhoto(sourceUri: string): Promise<string> {
  const dir = ensureFuelFilterPhotosDir();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${guessExtension(sourceUri)}`;
  const destination = new File(dir, name);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

export function deleteFuelFilterPhoto(uri: string | null | undefined): void {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Failed to delete fuel filter photo', error);
  }
}

export function deleteFuelFilterPhotos(uris: (string | null | undefined)[]): void {
  for (const uri of uris) {
    deleteFuelFilterPhoto(uri);
  }
}
