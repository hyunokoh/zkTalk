import { promises as dns } from 'node:dns';
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
 * Check if a literal IP (v4 or v6) lives in a private / loopback / link-local
 * / cloud-metadata range. Used both for IP-literal URLs and for the
 * post-DNS-resolution check below.
 */
function isBlockedIp(ip: string): boolean {
  const h = ip.toLowerCase().trim();
  if (h === '::' || h === '::1' || h === '[::1]') return true;

  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (v4) {
    const oa = Number(v4[1]);
    const ob = Number(v4[2]);
    if (oa === 0) return true;                        // 0.0.0.0/8
    if (oa === 10) return true;                       // 10.0.0.0/8
    if (oa === 127) return true;                      // 127.0.0.0/8
    if (oa === 169 && ob === 254) return true;        // link-local + cloud meta
    if (oa === 172 && ob >= 16 && ob <= 31) return true; // 172.16/12
    if (oa === 192 && ob === 168) return true;        // 192.168/16
    if (oa === 100 && ob >= 64 && ob <= 127) return true; // CGNAT 100.64/10
    if (oa >= 224) return true;                       // multicast / reserved
    return false;
  }
  // IPv6
  if (h.includes(':')) {
    if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique-local
    if (h.startsWith('fe80')) return true;                     // link-local
    if (h.startsWith('::ffff:')) {
      // IPv4-mapped — recurse on the v4 part
      return isBlockedIp(h.slice(7));
    }
    return false;
  }
  return false;
}

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
  if (hostname === 'localhost') return true;
  if (hostname === 'metadata.google.internal') return true;
  // IPv6 literal hostnames in URL come back without brackets
  return isBlockedIp(hostname);
}

/**
 * DNS-rebinding defence: resolve the hostname ourselves and reject if any
 * answer is in a blocked range. The hostname-only check above is
 * necessary but not sufficient — an attacker can register `evil.com`
 * pointing at 127.0.0.1 (or use rebinding tricks to flip mid-lookup).
 *
 * There is still a small TOCTOU window between this lookup and the
 * fetch's own lookup; closing it completely needs a custom undici
 * dispatcher with an Agent.lookup hook. For our v1 the reduced window
 * (~milliseconds) is enough to make exploitation impractical for a
 * link-preview side channel.
 */
async function resolvesToBlockedIp(hostname: string): Promise<boolean> {
  // IP literals already covered by isBlockedUrl
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return false;
  try {
    const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
    for (const a of addrs) {
      if (isBlockedIp(a.address)) return true;
    }
    return false;
  } catch {
    // DNS failure → fail closed
    return true;
  }
}

export async function getPreview(url: string): Promise<LinkPreview> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw AppError.badRequest('Invalid URL');
  }

  // Block requests to private/internal networks (SSRF prevention).
  // Two layers: (1) hostname/IP literal blocklist, (2) DNS lookup + IP
  // blocklist on resolved addresses to defeat rebinding via attacker DNS.
  if (isBlockedUrl(url)) {
    throw AppError.badRequest('URL not allowed');
  }
  const parsedForDns = new URL(url);
  if (await resolvesToBlockedIp(parsedForDns.hostname)) {
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

    // If redirected, check the redirect target is not internal — both
    // the literal hostname AND the resolved IP have to clear.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const next = new URL(location, url);
        if (
          isBlockedUrl(next.toString()) ||
          (await resolvesToBlockedIp(next.hostname))
        ) {
          return { url, title: null, description: null, image: null, siteName: null };
        }
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
