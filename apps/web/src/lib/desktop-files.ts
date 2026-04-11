export interface DesktopPickedFile {
  kind: 'desktop-picked-file';
  path: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export type ComposerPickedFile = File | DesktopPickedFile;

export function isDesktopPickedFile(file: ComposerPickedFile): file is DesktopPickedFile {
  return typeof file === 'object' && file !== null && 'kind' in file && file.kind === 'desktop-picked-file';
}

export async function pickDesktopFiles(
  options: { multiple?: boolean } = { multiple: true },
): Promise<DesktopPickedFile[] | null> {
  if (typeof window === 'undefined' || typeof window.zkTalkDesktop?.pickFiles !== 'function') {
    return null;
  }

  const pickedFiles = await window.zkTalkDesktop.pickFiles(options);
  if (!Array.isArray(pickedFiles) || pickedFiles.length === 0) {
    return [];
  }

  return pickedFiles.map((file) => ({
    kind: 'desktop-picked-file',
    path: String(file.path ?? ''),
    name: String(file.name ?? ''),
    type: String(file.type ?? ''),
    size: Number(file.size ?? 0),
    lastModified: Number(file.lastModified ?? Date.now()),
  }));
}

export async function readDesktopFileChunk(
  file: DesktopPickedFile,
  start: number,
  end: number,
): Promise<Uint8Array> {
  if (typeof window === 'undefined' || typeof window.zkTalkDesktop?.readFileChunk !== 'function') {
    throw new Error('Desktop file chunk reader is not available.');
  }

  const bytes = await window.zkTalkDesktop.readFileChunk({
    path: file.path,
    start,
    end,
  });

  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  return Uint8Array.from(bytes ?? []);
}
