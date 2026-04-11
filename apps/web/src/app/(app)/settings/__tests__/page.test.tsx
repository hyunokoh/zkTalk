import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from '../page';

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

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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
    expect(
      screen.getByRole('link', {
        name: /AI and translation Set default incoming translation behavior/i,
      }).getAttribute('href'),
    ).toBe('/settings/ai');
    expect(screen.getAllByText('settings.profileShareTitle').length).toBeGreaterThan(0);
    expect(screen.getByText('ProfileQRMock')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'friend.title settings.cardPeopleBody ›' }).getAttribute('href')).toBe('/friends');
    expect(screen.getByRole('link', { name: 'settings.profileShareTitle settings.profileShareBody ›' }).getAttribute('href')).toBe('/settings#profile-share');
  });

  it('opens the profile editor from settings', () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'profile.edit' }));

    expect(screen.getByText('ProfileEditorMock')).toBeTruthy();
  });
});
