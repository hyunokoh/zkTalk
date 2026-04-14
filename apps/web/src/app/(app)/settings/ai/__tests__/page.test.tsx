import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AISettingsPage from '../page';
import enLocale from '@/lib/i18n/locales/en';
import koLocale from '@/lib/i18n/locales/ko';

const mockSaveTranslationDisplay = vi.fn();
const mockRefetchUserSettings = vi.fn().mockResolvedValue(undefined);
let currentLocale: 'en' | 'ko' = 'en';
const mockDesktopBridgeSnapshot = {
  machine: {
    id: 'machine-1',
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-1',
    codexAuthState: 'auth_present',
    presence: 'online',
    lastSeenAt: '2026-04-12T14:00:10.000Z',
    createdAt: '2026-04-12T14:00:00.000Z',
    updatedAt: '2026-04-12T14:00:10.000Z',
  },
  presence: {
    machineId: 'machine-1',
    ownerUserId: 'user-1',
    status: 'online',
    codexAuthState: 'auth_present',
    activeCommandId: null,
    lastSeenAt: '2026-04-12T14:00:10.000Z',
    expiresAt: '2026-04-12T14:01:10.000Z',
  },
  recentCommandUpdates: [
    {
      commandId: 'command-9',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'accepted',
      summary: 'Accepted on the worker.',
      outputText: null,
      errorCode: null,
      createdAt: '2026-04-12T14:00:11.000Z',
    },
    {
      commandId: 'command-9',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'streaming',
      summary: null,
      outputText: 'partial output',
      errorCode: null,
      createdAt: '2026-04-12T14:00:12.000Z',
    },
    {
      commandId: 'command-9',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'completed',
      summary: 'Completed on the worker.',
      outputText: 'final output',
      errorCode: null,
      createdAt: '2026-04-12T14:00:13.000Z',
    },
  ],
  heartbeatTimeoutMs: 60000,
  registered: true,
};
const mockUserSettings = {
  translationDisplay: {
    uiLocale: 'en',
    mode: 'manual_only' as const,
    targetLanguage: null,
    readableLanguages: [],
  },
};

function translate(locale: 'en' | 'ko', key: string, params?: Record<string, string | number>) {
  const dictionary = locale === 'ko' ? koLocale : enLocale;
  let text = dictionary[key] ?? key;

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(value));
    }
  }

  return text;
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'ai-runtime') {
      return {
        data: {
          provider: 'mock',
          status: 'mock',
          issue: 'mock runtime',
        },
      };
    }

    if (queryKey[0] === 'user-settings') {
      return {
        data: mockUserSettings,
        refetch: mockRefetchUserSettings,
        isLoading: false,
      };
    }

    if (queryKey[0] === 'desktop-local-machine-bridge') {
      return {
        data: mockDesktopBridgeSnapshot,
        refetch: vi.fn(),
        isLoading: false,
      };
    }

    return { data: undefined, refetch: vi.fn(), isLoading: false };
  },
}));

vi.mock('@/lib/user-settings', () => ({
  fetchUserSettings: vi.fn(),
  saveTranslationDisplay: (...args: unknown[]) => mockSaveTranslationDisplay(...args),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, params?: Record<string, string | number>) =>
        translate(currentLocale, key, params),
    }),
    useI18nStore: (
      selector: (state: { locale: string; setLocale: (next: string) => void }) => unknown,
    ) =>
      selector({
        locale: currentLocale,
        setLocale: vi.fn(),
      }),
  };
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('AISettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = 'en';
    mockUserSettings.translationDisplay = {
      uiLocale: 'en',
      mode: 'manual_only',
      targetLanguage: null,
      readableLanguages: [],
    };
  });

  it('describes the actual web, desktop, and mobile AI entry points', () => {
    render(<AISettingsPage />);

    expect(
      screen.getByText(
        /current-draft composer actions, selected-message draft tools, and channel summaries/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/On mobile, AI currently starts from a selected message\./i),
    ).toBeTruthy();
    expect(
      screen.getByText(/selected-message reply draft keeps the composer reply path/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/selected-message rewrite replaces the current composer draft/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/selected-message translation stays inline on the message/i),
    ).toBeTruthy();
    expect(screen.getAllByText(/channel summary from the composer actions menu/i).length).toBe(2);
    expect(
      screen.getByText(
        /does not expose the rail assistant, current-draft composer AI menu, or channel summary entry points/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/desktop-first local Codex bridge uses stable language presets/i),
    ).toBeTruthy();
    expect(screen.getAllByText(/English only/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Korean preferred, English readable/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Manual only/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Included AI features by platform/i)).toBeTruthy();
    expect(screen.getByText(/Machine control and platform alignment/i)).toBeTruthy();
    expect(screen.getByText(/Desktop bridge result timeline/i)).toBeTruthy();
    expect(screen.getByText(/Operator Desktop · machine-1/i)).toBeTruthy();
    expect(screen.getAllByText(/Machine Operator Desktop · Command command-9/i).length).toBe(3);
    expect(screen.getByText(/partial output/i)).toBeTruthy();
    expect(screen.getByText(/Completed on the worker\./i)).toBeTruthy();
    expect(
      screen.getByText(
        /Current mobile builds expose runtime status, selected-message semantics, presets, and custom translation-rule editing from the AI and translation settings screen\./i,
      ),
    ).toBeTruthy();
  });

  it('renders the core AI settings chrome in Korean when locale is ko', () => {
    currentLocale = 'ko';

    render(<AISettingsPage />);

    expect(screen.getByRole('heading', { name: 'AI 설정' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '설정으로 돌아가기' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '자동 번역' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '머신 제어와 플랫폼 정렬' })).toBeTruthy();
    expect(screen.getByText('현재 런타임')).toBeTruthy();
    expect(screen.getByText('모바일 메시지 동작')).toBeTruthy();
    expect(screen.getByText('플랫폼별 포함 AI 기능')).toBeTruthy();
  });

  it('saves a translation preset through user settings', async () => {
    render(<AISettingsPage />);

    fireEvent.click(screen.getByTestId('translation-preset-english_only'));

    await waitFor(() => {
      expect(mockSaveTranslationDisplay).toHaveBeenCalledWith({
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      });
    });
    expect(mockRefetchUserSettings).toHaveBeenCalled();
  });

  it('saves custom target and readable languages through user settings', async () => {
    render(<AISettingsPage />);

    expect(screen.getByTestId('translation-active-rule-summary').textContent).toContain(
      'Manual only. Incoming messages stay in the original language until translated.',
    );

    fireEvent.change(screen.getByTestId('translation-mode-select'), {
      target: { value: 'target_language_except_readable' },
    });
    fireEvent.change(screen.getByTestId('translation-target-language-input'), {
      target: { value: 'pt-BR' },
    });
    fireEvent.change(screen.getByTestId('translation-readable-languages-input'), {
      target: { value: 'en, ko, pt-BR' },
    });
    fireEvent.click(screen.getByTestId('translation-custom-save-button'));

    await waitFor(() => {
      expect(mockSaveTranslationDisplay).toHaveBeenCalledWith({
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'pt-br',
        readableLanguages: ['en', 'ko', 'pt-br'],
      });
    });

    expect(screen.getByPlaceholderText('pt-BR')).toBeTruthy();
    expect(screen.getByPlaceholderText('en, ko, zh-Hant')).toBeTruthy();
    expect(
      screen.getByText(
        /enter ISO-style codes such as `pt-BR`, `zh-Hant`, or `fil`, and separate readable languages with commas\./i,
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('translation-active-rule-summary').textContent).toContain(
      'Manual only. Incoming messages stay in the original language until translated.',
    );
  });

  it('renders previously saved custom translation rules back into the form', async () => {
    mockUserSettings.translationDisplay = {
      uiLocale: 'en',
      mode: 'target_language_except_readable',
      targetLanguage: 'pt-br',
      readableLanguages: ['en', 'zh-hant', 'fil'],
    };

    render(<AISettingsPage />);

    await waitFor(() => {
      expect((screen.getByTestId('translation-mode-select') as HTMLSelectElement).value).toBe(
        'target_language_except_readable',
      );
    });

    expect(
      (screen.getByTestId('translation-target-language-input') as HTMLInputElement).value,
    ).toBe('pt-br');
    expect(
      (screen.getByTestId('translation-readable-languages-input') as HTMLInputElement).value,
    ).toBe('en, zh-hant, fil');
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.getByTestId('translation-active-rule-mode').textContent).toBe(
      'Auto-translate except readable languages',
    );
    expect(screen.getByTestId('translation-active-rule-target').textContent).toContain('pt-br');
    expect(screen.getByTestId('translation-active-rule-readable').textContent).toContain(
      'en, zh-hant, fil',
    );
    expect(screen.getByTestId('translation-active-rule-summary').textContent).toContain(
      'Auto-translate into pt-br, except messages already readable in en, zh-hant, fil.',
    );
  });

  it('blocks invalid custom language codes with actionable copy', async () => {
    render(<AISettingsPage />);

    fireEvent.change(screen.getByTestId('translation-mode-select'), {
      target: { value: 'target_language_all' },
    });
    fireEvent.change(screen.getByTestId('translation-target-language-input'), {
      target: { value: 'english_us' },
    });
    fireEvent.click(screen.getByTestId('translation-custom-save-button'));

    expect(
      await screen.findByText(
        /target language must use an ISO-style code like en, ko, pt-BR, or zh-Hant\./i,
      ),
    ).toBeTruthy();
  });

  it('explains that custom translation rules require ISO-style codes instead of free-form names', () => {
    render(<AISettingsPage />);

    expect(
      screen.getByText(
        /use lowercase or hyphenated ISO-style codes only, not free-form language names\./i,
      ),
    ).toBeTruthy();
  });

  it('shows the current runtime as live, mock, or unavailable instead of a fixed provider claim', () => {
    render(<AISettingsPage />);

    expect(screen.getByText('Current runtime')).toBeTruthy();
    expect(screen.getByText('Mock provider')).toBeTruthy();
    expect(screen.getByText('Mock AI')).toBeTruthy();
    expect(
      screen.getByText(
        /Responses come from local mock output\. Do not treat them as provider-backed AI\./i,
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Qwen via OpenRouter')).toBeNull();
  });
});
