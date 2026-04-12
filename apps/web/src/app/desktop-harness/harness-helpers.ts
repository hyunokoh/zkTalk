type DesktopHarnessMode = 'channel' | 'dm';

export type DesktopHarnessRequest =
  | {
    mode: 'channel';
    sessionToken: string;
    body: string;
    channelId: string;
    communitySlug: string;
  }
  | {
    mode: 'dm';
    sessionToken: string;
    body: string;
    conversationId: string;
  };

export type DesktopHarnessSummary = {
  modeLabel: string;
  destinationLabel: string;
  messagePreview: string;
};

export const DESKTOP_HARNESS_AUTH_OPTIONS = {
  authMode: 'bearer' as const,
};

function requireTrimmedParam(params: URLSearchParams, key: string): string {
  const value = params.get(key)?.trim();
  if (!value) {
    throw new Error(`Desktop harness is missing required ${key} query param.`);
  }

  return value;
}

function requireMode(mode: string | null): DesktopHarnessMode {
  if (mode === 'channel' || mode === 'dm') {
    return mode;
  }

  throw new Error(`Unsupported desktop harness mode: ${mode}`);
}

export function readDesktopHarnessRequest(params: URLSearchParams): DesktopHarnessRequest {
  const mode = requireMode(params.get('mode')?.trim() ?? null);
  const sessionToken = requireTrimmedParam(params, 'sessionToken');
  const body = requireTrimmedParam(params, 'body');

  if (mode === 'channel') {
    return {
      mode,
      sessionToken,
      body,
      channelId: requireTrimmedParam(params, 'channelId'),
      communitySlug: requireTrimmedParam(params, 'communitySlug'),
    };
  }

  return {
    mode,
    sessionToken,
    body,
    conversationId: requireTrimmedParam(params, 'conversationId'),
  };
}

function truncateMessagePreview(body: string): string {
  return body.length > 96 ? `${body.slice(0, 93)}...` : body;
}

export function buildDesktopHarnessSummary(
  request: DesktopHarnessRequest,
  t: (key: string, params?: Record<string, string | number>) => string,
): DesktopHarnessSummary {
  if (request.mode === 'channel') {
    return {
      modeLabel: t('desktopHarness.modeChannel'),
      destinationLabel: t('desktopHarness.destinationChannel', {
        communitySlug: request.communitySlug,
        channelId: request.channelId,
      }),
      messagePreview: truncateMessagePreview(request.body),
    };
  }

  return {
    modeLabel: t('desktopHarness.modeDm'),
    destinationLabel: t('desktopHarness.destinationDm', {
      conversationId: request.conversationId,
    }),
    messagePreview: truncateMessagePreview(request.body),
  };
}
