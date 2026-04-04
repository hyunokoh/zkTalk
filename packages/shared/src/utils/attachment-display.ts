export interface AttachmentDisplayLike {
  fileName: string;
  mimeType: string;
}

const ATTACHMENT_PLACEHOLDER_BODIES = new Set([
  '(attachment)',
  '(첨부파일)',
]);
const GENERIC_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-unknown-content-type',
  'application/unknown',
  'unknown/unknown',
]);
const IMAGE_FILE_NAME_PATTERN = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i;

function normalizeBody(body: string | null | undefined): string {
  return body?.trim() ?? '';
}

function normalizeMimeType(mimeType: string | null | undefined): string {
  return mimeType?.trim().toLowerCase() ?? '';
}

function isGenericMimeType(mimeType: string | null | undefined): boolean {
  return GENERIC_MIME_TYPES.has(normalizeMimeType(mimeType));
}

function isImageFileName(fileName: string | null | undefined): boolean {
  return typeof fileName === 'string' && IMAGE_FILE_NAME_PATTERN.test(fileName.trim());
}

export function isImageAttachmentMimeType(
  mimeType: string | null | undefined,
  fileName?: string | null | undefined,
): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (normalizedMimeType.startsWith('image/')) {
    return true;
  }

  if (isGenericMimeType(normalizedMimeType) && isImageFileName(fileName)) {
    return true;
  }

  return false;
}

export function hasOnlyImageAttachments<T extends AttachmentDisplayLike>(
  attachments: readonly T[],
): boolean {
  return attachments.length > 0
    && attachments.every((attachment) =>
      isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
    );
}

function matchesGeneratedAttachmentBody<T extends AttachmentDisplayLike>(
  normalizedBody: string,
  attachments: readonly T[],
): boolean {
  if (attachments.length === 0) {
    return false;
  }

  const [firstAttachment] = attachments;
  if (!firstAttachment) {
    return false;
  }

  if (attachments.length === 1) {
    return normalizedBody === firstAttachment.fileName.trim();
  }

  const suffixes = [
    `${firstAttachment.fileName} 외 ${attachments.length - 1}개`,
    `${firstAttachment.fileName} and ${attachments.length - 1} more`,
  ];

  return suffixes.includes(normalizedBody);
}

export function shouldHideAttachmentBody<T extends AttachmentDisplayLike>(
  body: string | null | undefined,
  attachments: readonly T[],
): boolean {
  if (attachments.length === 0) {
    return false;
  }

  const normalizedBody = normalizeBody(body);
  if (!normalizedBody) {
    return hasOnlyImageAttachments(attachments);
  }

  if (ATTACHMENT_PLACEHOLDER_BODIES.has(normalizedBody)) {
    return true;
  }

  if (!hasOnlyImageAttachments(attachments)) {
    return matchesGeneratedAttachmentBody(normalizedBody, attachments);
  }

  return matchesGeneratedAttachmentBody(normalizedBody, attachments);
}
