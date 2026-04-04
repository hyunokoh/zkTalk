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

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: { displayName: string; username: string; bio: string; avatarUrl: null } }) => unknown) =>
    selector({
      user: {
        displayName: 'Alice Example',
        username: 'alice',
        bio: 'Hello from settings',
        avatarUrl: null,
      },
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
    expect(screen.getAllByText('settings.profileShareTitle').length).toBeGreaterThan(0);
    expect(screen.getByText('ProfileQRMock')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'settings.openFriends' }).getAttribute('href')).toBe('/friends');
    expect(screen.getByRole('link', { name: 'settings.goHome' }).getAttribute('href')).toBe('/home');
  });

  it('opens the profile editor from settings', () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'profile.edit' }));

    expect(screen.getByText('ProfileEditorMock')).toBeTruthy();
  });
});
