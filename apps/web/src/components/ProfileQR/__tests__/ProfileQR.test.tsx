import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileQR } from '../ProfileQR';

const mockWriteText = vi.fn();

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: { id: string; displayName: string; username: string; avatarUrl: string | null } }) => unknown) =>
    selector({
      user: {
        id: 'user-123',
        displayName: 'Alice Example',
        username: 'alice',
        avatarUrl: 'http://127.0.0.1:4000/api/upload/assets/users/user-123/avatar.png',
      },
    }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (key === 'qr.shareTextTemplate') {
        return `Add ${values?.name} on zkTalk: ${values?.link}`;
      }
      return key;
    },
  }),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({
    displayName,
    avatarUrl,
  }: {
    displayName: string;
    avatarUrl?: string | null;
  }) => (
    <div data-testid="profile-qr-avatar" data-display-name={displayName} data-avatar-url={avatarUrl ?? ''} />
  ),
}));

describe('ProfileQR', () => {
  beforeEach(() => {
    mockWriteText.mockReset();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockWriteText,
      },
    });
  });

  it('copies the desktop share text with the mobile-style deep link', async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<ProfileQR />);

    fireEvent.click(screen.getByRole('button', { name: 'qr.copyShareText' }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        'Add Alice Example on zkTalk: zktalk://user/user-123?displayName=Alice+Example&username=alice',
      );
    });
  });

  it('renders the shareable web profile link for the signed-in user', () => {
    render(<ProfileQR />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('/user/user-123');
  });

  it('shows the signed-in user avatar above the QR card', () => {
    render(<ProfileQR />);

    expect(screen.getByTestId('profile-qr-avatar').getAttribute('data-avatar-url')).toBe(
      'http://127.0.0.1:4000/api/upload/assets/users/user-123/avatar.png',
    );
    expect(screen.getByText('Alice Example')).not.toBeNull();
  });
});
