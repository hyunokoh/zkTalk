import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CommunitySettingsPage from '../page';
import { ApiError } from '@/lib/api';

const mockPush = vi.fn();
const mockRefetch = vi.fn();

const queryState: {
  data: {
    id: string;
    name: string;
    description: string;
    visibility: string;
    iconUrl: string | null;
    updatedAt: string;
  } | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: typeof mockRefetch;
} = {
  data: {
    id: 'community-1',
    name: 'Alpha Team',
    description: 'Ops room',
    visibility: 'public',
    iconUrl: null,
    updatedAt: '2026-04-07T00:00:00.000Z',
  },
  isLoading: false,
  error: null as unknown,
  refetch: mockRefetch,
};

const roleState = {
  canManageSettings: true,
  isOwner: true,
  isLoading: false,
};

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

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt} />,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'alpha-team' }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => queryState,
  useMutation: ({ onSuccess, onError }: { onSuccess?: (value: unknown) => void; onError?: (error: unknown) => void }) => ({
    isPending: false,
    mutate: (value?: unknown) => {
      if (queryState.error) {
        onError?.(queryState.error);
        return;
      }
      onSuccess?.(value);
    },
  }),
  useQueryClient: () => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCommunityRole', () => ({
  useCommunityRole: () => roleState,
}));

vi.mock('@/stores/p2p-settings', () => ({
  useP2PSettingsStore: (selector: (state: {
    wifiOnly: boolean;
    autoSeed: boolean;
    setWifiOnly: (value: boolean) => void;
    setAutoSeed: (value: boolean) => void;
  }) => unknown) =>
    selector({
      wifiOnly: false,
      autoSeed: true,
      setWifiOnly: vi.fn(),
      setAutoSeed: vi.fn(),
    }),
}));

const showToast = vi.fn();

vi.mock('@/stores/toast', () => ({
  useToastStore: (selector: (state: { showToast: typeof showToast }) => unknown) =>
    selector({ showToast }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/upload-assets', () => ({
  uploadImageAsset: vi.fn(),
}));

vi.mock('@/lib/image-optimization', () => ({
  resolveImageRenderProps: () => ({ src: null, unoptimized: false }),
}));

vi.mock('@/lib/community-cache', () => ({
  mergeUpdatedCommunity: vi.fn(),
}));

vi.mock('@/lib/client-log', () => ({
  devLogError: vi.fn(),
}));

describe('CommunitySettingsPage', () => {
  beforeEach(() => {
    queryState.data = {
      id: 'community-1',
      name: 'Alpha Team',
      description: 'Ops room',
      visibility: 'public',
      iconUrl: null,
      updatedAt: '2026-04-07T00:00:00.000Z',
    };
    queryState.isLoading = false;
    queryState.error = null;
    roleState.canManageSettings = true;
    roleState.isOwner = true;
    roleState.isLoading = false;
    mockRefetch.mockReset();
    mockPush.mockReset();
    showToast.mockReset();
  });

  it('shows escape routes instead of a dead-end for non-admin members', () => {
    roleState.canManageSettings = false;
    roleState.isOwner = false;

    render(<CommunitySettingsPage />);

    expect(screen.getByText('settings.notAdmin')).toBeTruthy();
    expect(screen.getByText('settings.notAdminHelp')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'settings.backToCommunity' }).getAttribute('href')).toBe('/communities/alpha-team');
    expect(screen.getByRole('link', { name: 'settings.goHome' }).getAttribute('href')).toBe('/home');
  });

  it('shows a retry state when the settings payload cannot be loaded', () => {
    queryState.data = undefined;
    queryState.error = new ApiError(500, 'Internal server error');

    render(<CommunitySettingsPage />);

    expect(screen.getByText('settings.communityUnavailableTitle')).toBeTruthy();
    expect(screen.getByText('profile.connectionError')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
