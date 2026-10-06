import { Directory, File, Paths } from 'expo-file-system';

const IGNITION_COIL_PHOTOS_DIR = 'ignition-coil-photos';

function ensureIgnitionCoilPhotosDir(): Directory {
  const dir = new Directory(Paths.document, IGNITION_COIL_PHOTOS_DIR);
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

export async function persistIgnitionCoilPhoto(sourceUri: string): Promise<string> {
  const dir = ensureIgnitionCoilPhotosDir();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${guessExtension(sourceUri)}`;
  const destination = new File(dir, name);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

export function deleteIgnitionCoilPhoto(uri: string | null | undefined): void {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Failed to delete ignition coil photo', error);
  }
}

export function deleteIgnitionCoilPhotos(uris: (string | null | undefined)[]): void {
  for (const uri of uris) {
    deleteIgnitionCoilPhoto(uri);
  }
}
