import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigatorState = {
  onLine: true,
};

Object.defineProperty(window, 'navigator', {
  value: navigatorState,
  configurable: true,
});

function setNavigatorOnline(value: boolean) {
  navigatorState.onLine = value;
}

type MockSocketHandler = ((event?: Event) => void) | null;
type MockMessageHandler = ((event: MessageEvent) => void) | null;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: MockSocketHandler = null;
  onclose: MockSocketHandler = null;
  onerror: MockSocketHandler = null;
  onmessage: MockMessageHandler = null;
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new Event('close'));
  });
  send = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.resetModules();
    MockWebSocket.reset();
    setNavigatorOnline(true);
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('exposes offline and reconnecting status changes', async () => {
    const currentUser: {
      id: string;
      email: string;
      displayName: string;
      username: string;
    } | null = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: (
        selector: (state: { user: typeof currentUser }) => unknown,
      ) => selector({ user: currentUser }),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
    }));

    const { useWebSocket, useWebSocketStatus } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      const status = useWebSocketStatus();
      return <div>{status}</div>;
    }

    render(<Harness />);

    expect(screen.getByText('connecting')).toBeTruthy();

    const firstSocket = MockWebSocket.instances[0];
    firstSocket.readyState = MockWebSocket.OPEN;
    await act(async () => {
      firstSocket.onopen?.(new Event('open'));
    });

    await waitFor(() => {
      expect(screen.getByText('connected')).toBeTruthy();
    });

    setNavigatorOnline(false);
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText('offline')).toBeTruthy();
    });

    setNavigatorOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(MockWebSocket.instances).toHaveLength(2);
    const secondSocket = MockWebSocket.instances[1];
    expect(secondSocket.url).toContain('token=session-token');

    await act(async () => {
      secondSocket.onopen?.(new Event('open'));
    });

    await waitFor(() => {
      expect(screen.getByText('connected')).toBeTruthy();
    });
  });


  it('keeps the socket alive when the same user id is refreshed', async () => {
    let currentUser: {
      id: string;
      email: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
    } = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: (
        selector: (state: { user: typeof currentUser | null }) => unknown,
      ) => selector({ user: currentUser }),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    const view = render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.readyState = MockWebSocket.OPEN;
    firstSocket.onopen?.(new Event('open'));

    currentUser = {
      ...currentUser,
      displayName: 'Alice Updated',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    };
    view.rerender(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(firstSocket.close).not.toHaveBeenCalled();
  });
});
