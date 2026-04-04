import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FriendsPage from '../page';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/DesktopProfileQuickActions', () => ({
  DesktopProfileQuickActions: () => <div>DesktopProfileQuickActionsMock</div>,
}));

vi.mock('@/components/ProfileQR', () => ({
  ProfileQR: () => <div>ProfileQRMock</div>,
}));

vi.mock('@/components/ContactSync', () => ({
  ContactSync: () => <div>ContactSyncMock</div>,
}));

vi.mock('@/components/FriendList', () => ({
  FriendList: () => <div>FriendListMock</div>,
}));

describe('FriendsPage', () => {
  it('shows desktop share entry points and friends content together', () => {
    render(<FriendsPage />);

    expect(screen.getByText('friend.title')).toBeTruthy();
    expect(screen.getByText('DesktopProfileQuickActionsMock')).toBeTruthy();
    expect(screen.getByText('ProfileQRMock')).toBeTruthy();
    expect(screen.getByText('ContactSyncMock')).toBeTruthy();
    expect(screen.getByText('FriendListMock')).toBeTruthy();
  });
});
