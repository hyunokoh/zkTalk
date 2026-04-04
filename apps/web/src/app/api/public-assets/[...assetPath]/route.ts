const DEFAULT_API_URL = process.env.ZKTALK_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000';

function getApiBaseUrl(): string {
  return DEFAULT_API_URL.replace(/\/$/, '');
}

async function handlePublicAsset(context: { params: Promise<{ assetPath: string[] }> }) {
  const { assetPath } = await context.params;
  if (!Array.isArray(assetPath) || assetPath.length === 0) {
    return new Response('Missing asset path', { status: 400 });
  }

  const upstreamUrl = `${getApiBaseUrl()}/api/upload/assets/${assetPath.map(encodeURIComponent).join('/')}`;
  const upstream = await fetch(upstreamUrl, {
    method: 'GET',
    next: { revalidate: 300 },
  });

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
  _request: Request,
  context: { params: Promise<{ assetPath: string[] }> },
) {
  return handlePublicAsset(context);
}
