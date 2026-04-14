import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from '../page';

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
  lastCommand: {
    commandId: 'command-9',
    targetMachineId: 'machine-1',
    owningUserId: 'user-1',
    status: 'completed',
    summary: 'Completed on the worker.',
    outputText: 'final output',
    errorCode: null,
    createdAt: '2026-04-12T14:00:13.000Z',
  },
  heartbeatTimeoutMs: 60000,
  registered: true,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'desktop-local-machine-bridge-settings') {
      return {
        data: mockDesktopBridgeSnapshot,
        refetch: vi.fn(),
        isLoading: false,
      };
    }

    return { data: undefined, refetch: vi.fn(), isLoading: false };
  },
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
    useI18nStore: (
      selector: (state: { locale: string; setLocale: (next: string) => void }) => unknown,
    ) =>
      selector({
        locale: 'en',
        setLocale: vi.fn(),
      }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: (
    selector: (state: {
      user: { displayName: string; username: string; bio: string; avatarUrl: null };
      logout: () => Promise<void>;
    }) => unknown,
  ) =>
    selector({
      user: {
        displayName: 'Alice Example',
        username: 'alice',
        bio: 'Hello from settings',
        avatarUrl: null,
      },
      logout: vi.fn(async () => {}),
    }),
}));

vi.mock('@/components/ProfileQR', () => ({
  ProfileQR: () => <div>ProfileQRMock</div>,
}));

vi.mock('@/components/ProfileEditor', () => ({
  ProfileEditor: ({ onClose }: { onClose: () => void }) => (
    <div>
      <button onClick={onClose}>CloseProfileEditorMock</button>
      <div>ProfileEditorMock</div>
    </div>
  ),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div>UserAvatarMock</div>,
}));

describe('SettingsPage', () => {
  it('shows the profile editor entry and profile share hub', () => {
    render(<SettingsPage />);

    expect(screen.getByText('UserAvatarMock')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'profile.edit' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'settings.accountSectionTitle' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'settings.notificationsSectionTitle' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'settings.aiTranslationSectionTitle' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'settings.machineControlSectionTitle' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'settings.dataPrivacySectionTitle' })).toBeTruthy();
    expect(screen.getByText('settings.machineControlSnapshotTitle')).toBeTruthy();
    expect(screen.getByText('settings.machineControlStatusConnected')).toBeTruthy();
    expect(screen.getByText('settings.machineControlSummaryConnected')).toBeTruthy();
    expect(screen.getByText('settings.machineControlMachineLabel')).toBeTruthy();
    expect(screen.getByText('Operator Desktop')).toBeTruthy();
    expect(screen.getByText('settings.machineControlAuthLabel')).toBeTruthy();
    expect(screen.getByText('settings.machineControlAuthReady')).toBeTruthy();
    expect(screen.getByText('settings.machineControlRecentLabel')).toBeTruthy();
    expect(screen.getByText('settings.machineControlRecentWithSummary')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'settings.aiTranslationSectionAction' }).getAttribute('href'),
    ).toBe(
      '/settings/ai#translation-preferences',
    );
    expect(
      screen.getByRole('link', { name: 'settings.machineControlSectionAction' }).getAttribute('href'),
    ).toBe(
      '/settings/ai#machine-control',
    );
    expect(screen.getAllByText('settings.profileShareTitle').length).toBeGreaterThan(0);
    expect(screen.getByText('ProfileQRMock')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'friend.title settings.cardPeopleBody ›' })
        .getAttribute('href'),
    ).toBe('/friends');
    expect(
      screen
        .getByRole('link', { name: 'settings.profileShareTitle settings.profileShareBody ›' })
        .getAttribute('href'),
    ).toBe('/settings#profile-share');
  });

  it('opens the profile editor from settings', () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'profile.edit' }));

    expect(screen.getByText('ProfileEditorMock')).toBeTruthy();
  });
});
