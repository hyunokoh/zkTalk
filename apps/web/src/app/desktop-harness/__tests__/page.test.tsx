import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DesktopHarnessPage from '../page';
import {
  buildDesktopHarnessSummary,
  DESKTOP_HARNESS_AUTH_OPTIONS,
  readDesktopHarnessRequest,
} from '../harness-helpers';

const mockCreateAuthHeaders = vi.fn(() => new Headers({ Authorization: 'Bearer desktop-session-token' }));
const mockClearSessionToken = vi.fn();
const mockGetSessionToken = vi.fn();
const mockSetSessionToken = vi.fn();
const translate = (key: string) => key;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createAuthHeaders: (...args: unknown[]) => mockCreateAuthHeaders(...args),
  };
});

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: translate,
  }),
}));

vi.mock('@/lib/session-token', () => ({
  clearSessionToken: () => mockClearSessionToken(),
  getSessionToken: () => mockGetSessionToken(),
  setSessionToken: (...args: unknown[]) => mockSetSessionToken(...args),
}));

describe('DesktopHarnessPage', () => {
  beforeEach(() => {
    mockCreateAuthHeaders.mockClear();
    mockClearSessionToken.mockReset();
    mockGetSessionToken.mockReset();
    mockSetSessionToken.mockReset();
    mockGetSessionToken.mockReturnValue('stale-token');

    window.history.replaceState(
      null,
      '',
      '/desktop-harness?mode=channel&sessionToken=desktop-session-token&body=hello&channelId=channel-1&communitySlug=general',
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        replace: vi.fn(),
        search: '?mode=channel&sessionToken=desktop-session-token&body=hello&channelId=channel-1&communitySlug=general',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses the stored desktop harness token via bearer mode without manual authorization headers', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    render(<DesktopHarnessPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
    expect(mockSetSessionToken).toHaveBeenCalledWith('desktop-session-token', {
      desktopHarness: true,
    });
    expect(mockCreateAuthHeaders).toHaveBeenCalledWith(
      'http://localhost:4000',
      undefined,
      DESKTOP_HARNESS_AUTH_OPTIONS.authMode,
    );
    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/channels/channel-1/messages',
      expect.any(Object),
    );
    expect(requestInit.method).toBe('POST');
    expect(requestInit.credentials).toBe('include');
    expect(requestInit.keepalive).toBe(true);
    expect(requestInit.body).toBe(JSON.stringify({ bodyMarkdown: 'hello' }));
    expect(requestInit.headers).toBeInstanceOf(Headers);
    expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer desktop-session-token');
    expect(screen.getByText('desktopHarness.modeLabel')).toBeTruthy();
    expect(screen.getByText('desktopHarness.modeChannel')).toBeTruthy();
    expect(screen.getByText('desktopHarness.destinationChannel')).toBeTruthy();
    expect(screen.getByText('hello')).toBeTruthy();
    expect(screen.getByText('desktopHarness.redirectingChannel')).toBeTruthy();
  });

  it('maps internal harness failures to product copy instead of raw exception text', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('networkerror: desktop handoff failed'));

    render(<DesktopHarnessPage />);

    await waitFor(() => {
      expect(screen.getByText('desktopHarness.connectionError')).toBeTruthy();
    });

    expect(screen.getByText('desktopHarness.connectionError')).toBeTruthy();
    expect(screen.queryByText('networkerror: desktop handoff failed')).toBeNull();
  });

  it('keeps DM handoff requests on the explicit bearer-only path', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    window.history.replaceState(
      null,
      '',
      '/desktop-harness?mode=dm&sessionToken=desktop-session-token&body=hello&conversationId=dm-1',
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        replace: vi.fn(),
        search: '?mode=dm&sessionToken=desktop-session-token&body=hello&conversationId=dm-1',
      },
    });

    render(<DesktopHarnessPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/dm/conversations/dm-1/messages',
      expect.any(Object),
    );
    expect(screen.getByText('desktopHarness.redirectingDm')).toBeTruthy();
  });

  it('rejects incomplete links before any auth-bearing request is attempted', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    window.history.replaceState(
      null,
      '',
      '/desktop-harness?mode=channel&sessionToken=desktop-session-token&body=hello&channelId=channel-1',
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        replace: vi.fn(),
        search: '?mode=channel&sessionToken=desktop-session-token&body=hello&channelId=channel-1',
      },
    });

    render(<DesktopHarnessPage />);

    await waitFor(() => {
      expect(screen.getByText('desktopHarness.invalidLink')).toBeTruthy();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('desktopHarness.invalidLink')).toBeTruthy();
  });
});

describe('readDesktopHarnessRequest', () => {
  it('normalizes channel handoff params and trims whitespace', () => {
    expect(
      readDesktopHarnessRequest(
        new URLSearchParams(
          'mode=channel&sessionToken=%20desktop-token%20&body=%20hello%20&channelId=%20channel-1%20&communitySlug=%20general%20',
        ),
      ),
    ).toEqual({
      mode: 'channel',
      sessionToken: 'desktop-token',
      body: 'hello',
      channelId: 'channel-1',
      communitySlug: 'general',
    });
  });

  it('rejects blank payloads so the desktop exception stays tied to valid handoff links', () => {
    expect(() =>
      readDesktopHarnessRequest(
        new URLSearchParams('mode=dm&sessionToken=desktop-token&body=%20%20%20&conversationId=dm-1'),
      ),
    ).toThrow('Desktop harness is missing required body query param.');
  });
});

describe('buildDesktopHarnessSummary', () => {
  it('truncates long preview text and formats DM targets', () => {
    const longBody = 'x'.repeat(120);

    expect(
      buildDesktopHarnessSummary(
        {
          mode: 'dm',
          sessionToken: 'desktop-token',
          body: longBody,
          conversationId: 'dm-42',
        },
        translate,
      ),
    ).toEqual({
      modeLabel: 'desktopHarness.modeDm',
      destinationLabel: 'desktopHarness.destinationDm',
      messagePreview: `${'x'.repeat(93)}...`,
    });
  });
});
