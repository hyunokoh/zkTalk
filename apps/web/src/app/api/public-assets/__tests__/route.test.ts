import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, HEAD } from '../[...assetPath]/route';

describe('public asset proxy route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns 400 when the asset path is missing', async () => {
    const response = await GET(new Request('http://localhost/api/public-assets'), {
      params: Promise.resolve({ assetPath: [] }),
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Missing asset path');
  });

  it('proxies the upstream asset response with cache headers', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ZKTALK_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const upstreamBody = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=300',
          'content-disposition': 'inline; filename="icon.png"',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/icon.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'icon.png'] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/upload/assets/users/u/icon.png',
      expect.objectContaining({
        method: 'GET',
        next: { revalidate: 300 },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(response.headers.get('content-disposition')).toContain('icon.png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(upstreamBody);
  });

  it('encodes each asset path segment before calling the upstream asset route', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ZKTALK_API_URL', 'https://api.example.com/');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/my icon#.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'my icon#.png'] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/upload/assets/users/u/my%20icon%23.png',
      expect.objectContaining({
        method: 'GET',
        next: { revalidate: 300 },
      }),
    );
    expect(response.status).toBe(200);
  });

  it('proxies HEAD requests without forcing a GET downgrade', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ZKTALK_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=60',
          'content-disposition': 'inline; filename=\"icon.png\"',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await HEAD(new Request('http://localhost/api/public-assets/users/u/icon.png', {
      method: 'HEAD',
    }), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'icon.png'] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/upload/assets/users/u/icon.png',
      expect.objectContaining({
        method: 'HEAD',
        next: { revalidate: 300 },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    await expect(response.text()).resolves.toBe('');
  });

  it('forwards upstream error status and content type', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ZKTALK_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
        status: 404,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/missing.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'missing.png'] }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({ error: 'NOT_FOUND' });
  });

  it('returns 500 in production when the upstream API URL is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ZKTALK_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/icon.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'icon.png'] }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-zktalk-proxy-error')).toBe('misconfigured');
    expect(response.headers.get('x-zktalk-proxy-detail')).toBe('missing_api_url');
    await expect(response.text()).resolves.toBe('Public assets are temporarily unavailable.');
  });

  it('returns 500 in production when the upstream API URL is not an absolute http url', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ZKTALK_API_URL', '/api');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/icon.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'icon.png'] }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-zktalk-proxy-error')).toBe('misconfigured');
    expect(response.headers.get('x-zktalk-proxy-detail')).toBe('invalid_api_url');
    await expect(response.text()).resolves.toBe('Public assets are temporarily unavailable.');
  });

  it('returns 500 in production when the upstream API URL uses an unsupported protocol', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ZKTALK_API_URL', 'ftp://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/icon.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'icon.png'] }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-zktalk-proxy-error')).toBe('misconfigured');
    expect(response.headers.get('x-zktalk-proxy-detail')).toBe('unsupported_protocol');
    await expect(response.text()).resolves.toBe('Public assets are temporarily unavailable.');
  });

  it('returns 502 when the upstream asset fetch fails', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ZKTALK_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/public-assets/users/u/icon.png'), {
      params: Promise.resolve({ assetPath: ['users', 'u', 'icon.png'] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/upload/assets/users/u/icon.png',
      expect.objectContaining({
        method: 'GET',
        next: { revalidate: 300 },
      }),
    );
    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-zktalk-proxy-error')).toBe('upstream_unavailable');
    expect(response.headers.get('x-zktalk-proxy-detail')).toBe('TypeError');
    await expect(response.text()).resolves.toBe('Public asset proxy upstream unavailable');
  });
});
