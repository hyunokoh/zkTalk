export function getVersionedImageUrl(
  url: string | null | undefined,
  version?: string | null,
): string | null {
  if (!url) {
    return null;
  }

  if (!version) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}
