import { AppError } from '../../lib/errors.js';

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

// Simple in-memory cache (URL -> preview, TTL 1 hour)
const cache = new Map<string, { preview: LinkPreview; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function parseMetaTags(html: string, url: string): LinkPreview {
  const getContent = (property: string): string | null => {
    // Match both property="og:..." and name="og:..." patterns
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];
    // Also try reversed order: content before property
    const regex2 = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      'i',
    );
    const match2 = html.match(regex2);
    return match2 ? match2[1] : null;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    url,
    title: getContent('og:title') || titleMatch?.[1]?.trim() || null,
    description: getContent('og:description') || getContent('description') || null,
    image: getContent('og:image') || null,
    siteName: getContent('og:site_name') || null,
  };
}

/**
 * Check if a hostname resolves to a private/internal IP address.
 * Blocks SSRF attacks targeting internal services.
 */
function isBlockedUrl(urlStr: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return true;
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0'
  ) {
    return true;
  }

  // Block private IP ranges
  const privatePatterns = [
    /^10\./,                           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12
    /^192\.168\./,                     // 192.168.0.0/16
    /^169\.254\./,                     // Link-local
    /^0\./,                            // 0.0.0.0/8
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) return true;
  }

  // Block metadata endpoints (AWS, GCP, Azure)
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return true;
  }

  return false;
}

export async function getPreview(url: string): Promise<LinkPreview> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw AppError.badRequest('Invalid URL');
  }

  // Block requests to private/internal networks (SSRF prevention)
  if (isBlockedUrl(url)) {
    throw AppError.badRequest('URL not allowed');
  }

  // Check cache
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.preview;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'zkTalk/1.0 (link preview)',
        Accept: 'text/html',
      },
      redirect: 'manual', // Don't follow redirects to prevent SSRF via redirect to internal IPs
    });

    // If redirected, check the redirect target is not internal
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location && isBlockedUrl(new URL(location, url).toString())) {
        return { url, title: null, description: null, image: null, siteName: null };
      }
    }

    clearTimeout(timeout);

    if (!response.ok) {
      return { url, title: null, description: null, image: null, siteName: null };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return { url, title: null, description: null, image: null, siteName: null };
    }

    // Read only first 50KB
    const reader = response.body?.getReader();
    if (!reader) return { url, title: null, description: null, image: null, siteName: null };

    let html = '';
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    const preview = parseMetaTags(html, url);
    cache.set(url, { preview, expiresAt: Date.now() + CACHE_TTL });
    return preview;
  } catch {
    return { url, title: null, description: null, image: null, siteName: null };
  }
}
