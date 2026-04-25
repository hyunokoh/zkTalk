const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  dmg: 'application/x-apple-diskimage',
  iso: 'application/x-iso9660-image',
  pkg: 'application/vnd.apple.installer+xml',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  bz2: 'application/x-bzip2',
  xz: 'application/x-xz',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  exe: 'application/vnd.microsoft.portable-executable',
  msi: 'application/x-msi',
  apk: 'application/vnd.android.package-archive',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  zip: 'application/zip',
};
const GENERIC_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-unknown-content-type',
  'application/unknown',
  'unknown/unknown',
]);

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
}

export function guessMimeTypeFromFileName(fileName: string): string {
  return MIME_MAP[getFileExtension(fileName)] ?? 'application/octet-stream';
}

// Browsers and OS share-sheets occasionally hand us non-canonical MIME
// strings: `image/jpg` (should be image/jpeg), `IMAGE/JPEG` (uppercase),
// `image/x-png` (legacy). Normalise so downstream consumers — including
// the server's `mimeType.startsWith('image/')` check — never have to
// deal with the variants.
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

function normalizeMimeType(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return MIME_ALIASES[lower] ?? lower;
}

export function resolveFileMimeType(file: Pick<File, 'name' | 'type'>): string {
  const normalizedType = normalizeMimeType(file.type ?? '');
  if (!GENERIC_MIME_TYPES.has(normalizedType)) {
    return normalizedType;
  }

  return guessMimeTypeFromFileName(file.name);
}

export function isImageFileLike(file: Pick<File, 'name' | 'type'>): boolean {
  return resolveFileMimeType(file).startsWith('image/');
}
