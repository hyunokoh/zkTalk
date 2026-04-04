function extractRouteFromProtocolUrl(url) {
  try {
    const parsed = new URL(url);
    const isHttpUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const pathSegments = parsed.pathname.split('/').filter(Boolean);

    if (isHttpUrl && pathSegments[0] === 'user' && pathSegments[1]) {
      const params = new URLSearchParams(parsed.search);
      params.set('profileUserId', decodeURIComponent(pathSegments[1]));
      return `/friends?${params.toString()}`;
    }

    const routeSegments = [
      parsed.hostname,
      ...pathSegments,
    ].filter(Boolean);

    if (routeSegments.length === 0) {
      return null;
    }

    if (routeSegments[0] === 'user' && routeSegments[1]) {
      const params = new URLSearchParams(parsed.search);
      params.set('profileUserId', decodeURIComponent(routeSegments[1]));
      return `/friends?${params.toString()}`;
    }

    return `/${routeSegments.join('/')}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return null;
  }
}

function extractSharedProfileRoute(rawText) {
  const clipboardText = typeof rawText === 'string' ? rawText.trim() : '';
  if (!clipboardText) {
    return null;
  }

  const protocolMatch =
    clipboardText.match(/zktalk:\/\/user\/[^\s]+/iu)?.[0]
    ?? clipboardText.match(/https?:\/\/[^\s]+\/user\/[^\s]+/iu)?.[0]
    ?? '';

  return protocolMatch ? extractRouteFromProtocolUrl(protocolMatch) : null;
}

module.exports = {
  extractRouteFromProtocolUrl,
  extractSharedProfileRoute,
};
