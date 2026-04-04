import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../[...assetPath]/route';

describe('public asset proxy route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 400 when the asset path is missing', async () => {
    const response = await GET(new Request('http://localhost/api/public-assets'), {
      params: Promise.resolve({ assetPath: [] }),
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Missing asset path');
  });

  it('proxies the upstream asset response with cache headers', async () => {
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

  it('forwards upstream error status and content type', async () => {
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
});
