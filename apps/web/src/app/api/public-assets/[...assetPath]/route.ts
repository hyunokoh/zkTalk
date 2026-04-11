function getConfiguredApiUrl(): string | undefined {
  const configuredApiUrl = process.env.ZKTALK_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  return configuredApiUrl || undefined;
}

class PublicAssetProxyConfigError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = 'PublicAssetProxyConfigError';
  }
}

function normalizeApiBaseUrl(configuredApiUrl: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredApiUrl);
  } catch {
    throw new PublicAssetProxyConfigError(
      'Public asset proxy requires ZKTALK_API_URL or NEXT_PUBLIC_API_URL to be an absolute http(s) URL',
      'invalid_api_url',
    );
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new PublicAssetProxyConfigError(
      'Public asset proxy requires ZKTALK_API_URL or NEXT_PUBLIC_API_URL to use http or https',
      'unsupported_protocol',
    );
  }

  return parsedUrl.toString().replace(/\/$/, '');
}

function getApiBaseUrl(): string {
  const configuredApiUrl = getConfiguredApiUrl();

  if (configuredApiUrl) {
    return normalizeApiBaseUrl(configuredApiUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new PublicAssetProxyConfigError(
      'Public asset proxy requires ZKTALK_API_URL or NEXT_PUBLIC_API_URL in production',
      'missing_api_url',
    );
  }

  return 'http://127.0.0.1:4000';
}

function buildProxyErrorHeaders(
  error: 'misconfigured' | 'upstream_unavailable',
  detail: string,
): HeadersInit {
  return {
    'cache-control': 'no-store',
    'content-type': 'text/plain; charset=utf-8',
    'x-zktalk-proxy-error': error,
    'x-zktalk-proxy-detail': detail,
  };
}

async function handlePublicAsset(
  request: Request,
  context: { params: Promise<{ assetPath: string[] }> },
) {
  const { assetPath } = await context.params;
  if (!Array.isArray(assetPath) || assetPath.length === 0) {
    return new Response('Missing asset path', { status: 400 });
  }

  let apiBaseUrl: string;
  try {
    apiBaseUrl = getApiBaseUrl();
  } catch (error) {
    return new Response('Public assets are temporarily unavailable.', {
      status: 500,
      headers: buildProxyErrorHeaders(
        'misconfigured',
        error instanceof PublicAssetProxyConfigError ? error.detail : 'unknown',
      ),
    });
  }

  const upstreamUrl = `${apiBaseUrl}/api/upload/assets/${assetPath.map(encodeURIComponent).join('/')}`;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      next: { revalidate: 300 },
    });
  } catch (error) {
    return new Response('Public asset proxy upstream unavailable', {
      status: 502,
      headers: buildProxyErrorHeaders(
        'upstream_unavailable',
        error instanceof Error ? error.name : 'UnknownError',
      ),
    });
  }

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': upstream.headers.get('cache-control') ?? 'public, max-age=300',
      'content-disposition': upstream.headers.get('content-disposition') ?? 'inline',
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ assetPath: string[] }> },
) {
  return handlePublicAsset(request, context);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ assetPath: string[] }> },
) {
  return handlePublicAsset(request, context);
}
