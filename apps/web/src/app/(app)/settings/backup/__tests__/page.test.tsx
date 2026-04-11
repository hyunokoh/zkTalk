import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BackupSettingsPage from '../page';

const mockApi = vi.fn();
const apiModule = vi.hoisted(() => {
  class HoistedMockApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }

  return { MockApiError: HoistedMockApiError };
});

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) {
        return key;
      }

      return `${key}:${JSON.stringify(vars)}`;
    },
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({
      user: { id: 'user-1' },
    }),
}));

vi.mock('@/lib/api', () => ({
  api: (...args: unknown[]) => mockApi(...args),
  ApiError: apiModule.MockApiError,
}));

vi.mock('@/lib/client-log', () => ({
  devLogError: vi.fn(),
}));

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  generateKeyPair: vi.fn(),
  getPrivateKey: vi.fn(),
  storePrivateKey: vi.fn(),
}));

describe('BackupSettingsPage', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  it('shows a product authorization message when backup export is rejected', async () => {
    mockApi.mockRejectedValue(new apiModule.MockApiError(403, 'Forbidden'));

    render(<BackupSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'backup.export' }));

    expect(await screen.findByText('common.notAuthorized')).toBeTruthy();
  });

  it('shows a product invalid-file message when backup import validation fails', async () => {
    mockApi.mockRejectedValue(new Error('request failed with status 400'));

    render(<BackupSettingsPage />);

    const input = screen.getByLabelText('backup.import') as HTMLInputElement;
    const file = new File(['encrypted-payload'], 'backup.enc', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('encrypted-payload'),
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('backup.importInvalid')).toBeTruthy();
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});
