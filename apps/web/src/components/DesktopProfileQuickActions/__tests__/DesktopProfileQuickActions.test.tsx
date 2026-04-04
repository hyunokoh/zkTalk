import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopProfileQuickActions } from '../DesktopProfileQuickActions';

const mockPush = vi.fn();
const mockReadText = vi.fn();

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
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams('source=home'),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('DesktopProfileQuickActions', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReadText.mockReset();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: mockReadText,
      },
    });
  });

  it('opens the desktop friend-add flow from a pasted mobile share string', async () => {
    mockReadText.mockResolvedValue(
      'Add Alice Example on zkTalk: zktalk://user/user-123?displayName=Alice+Example&username=alice',
    );

    render(<DesktopProfileQuickActions compact />);

    fireEvent.click(screen.getByRole('button', { name: 'app.desktopPasteProfile' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/friends?source=home&profileUserId=user-123&displayName=Alice+Example&username=alice',
      );
    });
  });

  it('shows parse feedback when the clipboard does not contain a zkTalk profile', async () => {
    mockReadText.mockResolvedValue('not a zkTalk profile');

    render(<DesktopProfileQuickActions compact />);

    fireEvent.click(screen.getByRole('button', { name: 'app.desktopPasteProfile' }));

    expect(await screen.findByText('friend.sharedProfileParseError')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
