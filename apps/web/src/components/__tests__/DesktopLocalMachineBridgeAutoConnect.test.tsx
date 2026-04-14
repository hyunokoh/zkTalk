import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DesktopLocalMachineBridgeAutoConnect } from '../DesktopLocalMachineBridgeAutoConnect';

const mockEnsureDesktopLocalMachineBridgeOnline = vi.fn();
const mockDisconnectDesktopLocalMachineBridge = vi.fn();
const mockIsDesktopRuntime = vi.fn();

vi.mock('@/lib/local-machine-bridge-loopback', () => ({
  ensureDesktopLocalMachineBridgeOnline: (...args: unknown[]) =>
    mockEnsureDesktopLocalMachineBridgeOnline(...args),
  disconnectDesktopLocalMachineBridge: (...args: unknown[]) =>
    mockDisconnectDesktopLocalMachineBridge(...args),
}));

vi.mock('@/lib/runtime-config', () => ({
  isDesktopRuntime: () => mockIsDesktopRuntime(),
}));

describe('DesktopLocalMachineBridgeAutoConnect', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('stays idle when there is no owner or when the web runtime is not desktop', () => {
    mockIsDesktopRuntime.mockReturnValue(false);

    const { rerender, unmount } = render(
      <DesktopLocalMachineBridgeAutoConnect ownerUserId={null} />,
    );

    rerender(<DesktopLocalMachineBridgeAutoConnect ownerUserId="user-1" />);
    unmount();

    expect(mockEnsureDesktopLocalMachineBridgeOnline).not.toHaveBeenCalled();
    expect(mockDisconnectDesktopLocalMachineBridge).not.toHaveBeenCalled();
  });

  it('ensures the bridge immediately and keeps heartbeats running on desktop', async () => {
    vi.useFakeTimers();
    mockIsDesktopRuntime.mockReturnValue(true);
    mockEnsureDesktopLocalMachineBridgeOnline.mockResolvedValue({
      registered: true,
    });

    render(<DesktopLocalMachineBridgeAutoConnect ownerUserId="user-1" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockEnsureDesktopLocalMachineBridgeOnline).toHaveBeenCalledTimes(1);
    expect(mockEnsureDesktopLocalMachineBridgeOnline).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
    });

    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await Promise.resolve();
    });

    expect(mockEnsureDesktopLocalMachineBridgeOnline).toHaveBeenCalledTimes(2);
  });

  it('cleans up the heartbeat interval when the component unmounts', async () => {
    vi.useFakeTimers();
    mockIsDesktopRuntime.mockReturnValue(true);
    mockEnsureDesktopLocalMachineBridgeOnline.mockResolvedValue({
      registered: true,
    });

    const { unmount } = render(<DesktopLocalMachineBridgeAutoConnect ownerUserId="user-2" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockEnsureDesktopLocalMachineBridgeOnline).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(40_000);
      await Promise.resolve();
    });

    expect(mockEnsureDesktopLocalMachineBridgeOnline).toHaveBeenCalledTimes(1);
  });

  it('disconnects the desktop bridge when the authenticated owner disappears', async () => {
    mockIsDesktopRuntime.mockReturnValue(true);
    mockDisconnectDesktopLocalMachineBridge.mockResolvedValue({
      registered: true,
    });

    const { rerender } = render(<DesktopLocalMachineBridgeAutoConnect ownerUserId="user-3" />);

    rerender(<DesktopLocalMachineBridgeAutoConnect ownerUserId={null} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDisconnectDesktopLocalMachineBridge).toHaveBeenCalledTimes(1);
    expect(mockDisconnectDesktopLocalMachineBridge).toHaveBeenCalledWith();
  });
});
