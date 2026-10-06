import { Directory, File, Paths } from 'expo-file-system';

const SPARK_PLUG_PHOTOS_DIR = 'spark-plug-photos';

function ensureSparkPlugPhotosDir(): Directory {
  const dir = new Directory(Paths.document, SPARK_PLUG_PHOTOS_DIR);
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

export async function persistSparkPlugPhoto(sourceUri: string): Promise<string> {
  const dir = ensureSparkPlugPhotosDir();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${guessExtension(sourceUri)}`;
  const destination = new File(dir, name);
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

export function deleteSparkPlugPhoto(uri: string | null | undefined): void {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Failed to delete spark plug photo', error);
  }
}

export function deleteSparkPlugPhotos(uris: (string | null | undefined)[]): void {
  for (const uri of uris) {
    deleteSparkPlugPhoto(uri);
  }
}
