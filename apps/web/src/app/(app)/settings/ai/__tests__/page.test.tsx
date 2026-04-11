import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AISettingsPage from '../page';

const mockSaveTranslationDisplay = vi.fn();
const mockRefetchUserSettings = vi.fn().mockResolvedValue(undefined);

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
        data: {
          translationDisplay: {
            uiLocale: 'en',
            mode: 'manual_only',
            targetLanguage: null,
            readableLanguages: [],
          },
        },
        refetch: mockRefetchUserSettings,
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

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'ai.runtimeMock') return 'Mock AI';
      if (key === 'ai.runtimeDisabled') return 'AI disabled';
      if (key === 'ai.runtimeMisconfigured') return 'AI misconfigured';
      if (key === 'ai.runtimeMockHint') {
        return 'Responses come from local mock output. Do not treat them as provider-backed AI.';
      }
      if (key === 'ai.runtimeDisabledHintWithIssue') {
        return `AI is disabled: ${params?.issue ?? ''}`;
      }
      if (key === 'ai.runtimeMisconfiguredHintWithIssue') {
        return `AI is misconfigured: ${params?.issue ?? ''}`;
      }
      if (key === 'ai.runtimeUnavailableHintWithIssue') {
        return `AI is unavailable: ${params?.issue ?? ''}`;
      }
      return key;
    },
  }),
}));

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
    expect(screen.getAllByText(/channel summary from the composer actions menu/i).length).toBe(
      2,
    );
    expect(
      screen.getByText(/does not expose the rail assistant, current-draft composer AI menu, or channel summary entry points/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/desktop-first local Codex bridge uses stable language presets/i),
    ).toBeTruthy();
    expect(screen.getByText(/english_only/i)).toBeTruthy();
    expect(screen.getByText(/korean_preferred_english_readable/i)).toBeTruthy();
    expect(screen.getAllByText(/manual_only/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Included AI features by platform/i)).toBeTruthy();
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
