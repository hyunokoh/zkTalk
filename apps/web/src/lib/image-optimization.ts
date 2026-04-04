const UPLOAD_ASSET_PREFIX = '/api/upload/assets/';
const PUBLIC_ASSET_PREFIX = '/api/public-assets/';
const PARSE_BASE_URL = 'http://zktalk.local';
const FIRST_PARTY_IMAGE_PATTERNS = [
  /^\/api\/upload\/assets\//i,
  /^\/api\/public-assets\//i,
];

function extractFirstPartyAssetPath(src: string): string | null {
  try {
    const parsed = new URL(src, PARSE_BASE_URL);
    if (parsed.pathname.startsWith(UPLOAD_ASSET_PREFIX)) {
      return `${PUBLIC_ASSET_PREFIX}${parsed.pathname.slice(UPLOAD_ASSET_PREFIX.length)}${parsed.search}${parsed.hash}`;
    }

    if (parsed.pathname.startsWith(PUBLIC_ASSET_PREFIX)) {
      return `${PUBLIC_ASSET_PREFIX}${parsed.pathname.slice(PUBLIC_ASSET_PREFIX.length)}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

function appendImageVersion(
  src: string | null | undefined,
  version: string | null | undefined,
): string | null | undefined {
  if (!src || !version) {
    return src;
  }

  try {
    const parsed = new URL(src, PARSE_BASE_URL);
    parsed.searchParams.set('v', version);
    const isAbsolute = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(src);
    return isAbsolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}v=${encodeURIComponent(version)}`;
  }
}

export function shouldUseUnoptimizedImage(src: string | null | undefined): boolean {
  if (!src) {
    return true;
  }

  const normalizedSrc = getOptimizedImageSrc(src);
  return !FIRST_PARTY_IMAGE_PATTERNS.some((pattern) => pattern.test(normalizedSrc ?? ''));
}

export function getOptimizedImageSrc(
  src: string | null | undefined,
  version?: string | null,
): string | null | undefined {
  if (!src) {
    return src;
  }

  const normalizedAssetPath = extractFirstPartyAssetPath(src);
  if (normalizedAssetPath) {
    return appendImageVersion(normalizedAssetPath, version);
  }

  return appendImageVersion(src, version);
}

export function resolveImageRenderProps(
  src: string | null | undefined,
  version?: string | null,
): {
  src: string | null | undefined;
  unoptimized: boolean;
} {
  const resolvedSrc = getOptimizedImageSrc(src, version);
  return {
    src: resolvedSrc,
    unoptimized: shouldUseUnoptimizedImage(resolvedSrc),
  };
}
