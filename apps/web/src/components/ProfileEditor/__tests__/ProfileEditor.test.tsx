import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@zktalk/shared';
import { ProfileEditor } from '../ProfileEditor';

const {
  mockApi,
  MockApiError,
  mockUploadImageAsset,
  mockSetUser,
  mockFetchUser,
  mockShowToast,
  baseUser,
} = vi.hoisted(() => {
  const user: User = {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice Example',
    username: 'alice',
    avatarUrl: 'https://cdn.example.com/avatar-old.png',
    bio: 'Hello from zkTalk',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  };

  return {
    mockApi: vi.fn(),
    MockApiError: class ApiError extends Error {
      status: number;
      code?: string;

      constructor(status: number, message: string, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
      }
    },
    mockUploadImageAsset: vi.fn(),
    mockSetUser: vi.fn(),
    mockFetchUser: vi.fn().mockResolvedValue(undefined),
    mockShowToast: vi.fn(),
    baseUser: user,
  };
});

vi.mock('@/lib/api', () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

vi.mock('@/lib/upload-assets', () => ({
  uploadImageAsset: mockUploadImageAsset,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (
    selector: (state: {
      user: User;
      setUser: typeof mockSetUser;
      fetchUser: typeof mockFetchUser;
    }) => unknown,
  ) => selector({
    user: baseUser,
    setUser: mockSetUser,
    fetchUser: mockFetchUser,
  }),
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({
    displayName,
    avatarUrl,
  }: {
    displayName: string;
    avatarUrl: string | null;
  }) => (
    <div
      data-testid="user-avatar"
      data-avatar-url={avatarUrl ?? ''}
      data-display-name={displayName}
    />
  ),
}));

function renderProfileEditor(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileEditor onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe('ProfileEditor', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockUploadImageAsset.mockReset();
    mockSetUser.mockReset();
    mockFetchUser.mockClear();
    mockShowToast.mockReset();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      },
    });
  });

  it('keeps the selected avatar local until save is clicked', async () => {
    mockUploadImageAsset.mockResolvedValue('https://cdn.example.com/avatar-new.png');
    const { container } = renderProfileEditor();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImageAsset).toHaveBeenCalledWith(file, 'user_avatar');
    });

    expect(screen.getByTestId('user-avatar').getAttribute('data-avatar-url')).toBe(
      'https://cdn.example.com/avatar-new.png',
    );
    expect(mockApi).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('saves the uploaded avatar only when save is pressed', async () => {
    const uploadedAvatarUrl = 'https://cdn.example.com/avatar-new.png';
    const updatedUser: User = {
      ...baseUser,
      avatarUrl: uploadedAvatarUrl,
      updatedAt: '2026-04-01T00:00:00.000Z',
    };

    mockUploadImageAsset.mockResolvedValue(uploadedAvatarUrl);
    mockApi.mockResolvedValue({ user: updatedUser });

    const { container } = renderProfileEditor();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImageAsset).toHaveBeenCalledWith(file, 'user_avatar');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-avatar').getAttribute('data-avatar-url')).toBe(uploadedAvatarUrl);
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/me', {
        method: 'PATCH',
        body: { avatarUrl: uploadedAvatarUrl },
      });
    });

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
      expect(mockFetchUser).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'success',
        message: 'profile.saved',
      });
    });
  });

  it('shows an error toast for oversized avatar files', async () => {
    const { container } = renderProfileEditor();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const oversizedBytes = new Uint8Array((10 * 1024 * 1024) + 1);
    const file = new File([oversizedBytes], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'error',
        message: 'profile.avatarUploadTooLarge',
      });
    });
  });

  it('shows an error toast when saving fails', async () => {
    mockApi.mockRejectedValue(new MockApiError(500, 'server exploded'));
    renderProfileEditor();

    fireEvent.change(screen.getByTestId('profile-display-name-input'), {
      target: { value: 'Alice Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'error',
        message: 'profile.connectionError',
      });
    });
  });

  it('shows a clear client-side error for oversized avatar files', async () => {
    const { container } = renderProfileEditor();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const oversizedBytes = new Uint8Array((10 * 1024 * 1024) + 1);
    const file = new File([oversizedBytes], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('profile-avatar-error').textContent).toBe('profile.avatarUploadTooLarge');
    });

    expect(mockUploadImageAsset).not.toHaveBeenCalled();
  });

  it('shows a connection error when the avatar upload request cannot reach the API', async () => {
    mockUploadImageAsset.mockRejectedValue(new TypeError('Failed to fetch'));
    const { container } = renderProfileEditor();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('profile-avatar-error').textContent).toBe('profile.connectionError');
    });
  });

  it('only closes when the backdrop itself is pressed', () => {
    const onClose = vi.fn();
    renderProfileEditor(onClose);

    fireEvent.mouseDown(screen.getByTestId('profile-editor'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTestId('profile-editor-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
