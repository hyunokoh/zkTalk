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

export function resolveFileMimeType(file: Pick<File, 'name' | 'type'>): string {
  const normalizedType = file.type.trim().toLowerCase();
  if (!GENERIC_MIME_TYPES.has(normalizedType)) {
    return file.type;
  }

  return guessMimeTypeFromFileName(file.name);
}

export function isImageFileLike(file: Pick<File, 'name' | 'type'>): boolean {
  return resolveFileMimeType(file).startsWith('image/');
}
