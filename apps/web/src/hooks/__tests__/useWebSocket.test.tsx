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
type MockCloseEvent = Event & { code?: number; reason?: string };

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: MockSocketHandler = null;
  onclose: ((event: MockCloseEvent) => void) | null = null;
  onerror: MockSocketHandler = null;
  onmessage: MockMessageHandler = null;
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(Object.assign(new Event('close'), { code: 1000, reason: 'Client disconnect' }));
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

function createAuthStoreMock<TUser>(getUser: () => TUser) {
  const useAuthStore = (selector: (state: { user: TUser }) => unknown) =>
    selector({ user: getUser() });
  useAuthStore.getState = () => ({ user: getUser() });
  return useAuthStore;
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
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
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
    expect(secondSocket.url).toBe('ws://127.0.0.1:4000/api/ws?token=session-token');

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
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
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

  it('reconnects when the session token changes for the same user', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };
    let currentToken = 'session-token';

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => currentToken,
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.readyState = MockWebSocket.OPEN;
    firstSocket.onopen?.(new Event('open'));

    currentToken = 'refreshed-session-token';
    await act(async () => {
      window.dispatchEvent(new CustomEvent('zktalk-session-token-changed'));
    });

    expect(firstSocket.close).toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toBe(
      'ws://127.0.0.1:4000/api/ws?token=refreshed-session-token',
    );
  });

  it('keeps same-origin browser sockets cookie-first when the session token changes', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };
    let currentToken: string | null = 'session-token';

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => `ws://${window.location.host}/api/ws`,
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => currentToken,
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    const firstSocket = MockWebSocket.instances[0];
    expect(firstSocket.url).toBe(`ws://${window.location.host}/api/ws`);

    firstSocket.readyState = MockWebSocket.OPEN;
    firstSocket.onopen?.(new Event('open'));

    currentToken = null;
    await act(async () => {
      window.dispatchEvent(new CustomEvent('zktalk-session-token-changed'));
    });

    expect(firstSocket.close).not.toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('disconnects without reconnecting when the session token is cleared', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };
    let currentToken: string | null = 'session-token';

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => currentToken,
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.readyState = MockWebSocket.OPEN;
    firstSocket.onopen?.(new Event('open'));

    currentToken = null;
    await act(async () => {
      window.dispatchEvent(new CustomEvent('zktalk-session-token-changed'));
    });

    expect(firstSocket.close).toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('does not append a query token for same-origin web sockets', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => `ws://${window.location.host}/api/ws`,
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(`ws://${window.location.host}/api/ws`);
  });

  it('appends a query token for normal cross-origin web sockets', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(
      'ws://127.0.0.1:4000/api/ws?token=session-token',
    );
  });

  it('keeps the query token for same-origin desktop websocket sessions', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => `ws://${window.location.host}/api/ws`,
      isDesktopRuntime: () => true,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'desktop-session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('token=desktop-session-token');
  });

  it('keeps the query token for cross-origin desktop harness websocket sessions', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'harness-session-token',
      hasDesktopHarnessSession: () => true,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('token=harness-session-token');
  });

  it('keeps same-origin desktop harness websocket sessions cookie-first', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => `ws://${window.location.host}/api/ws`,
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'harness-session-token',
      hasDesktopHarnessSession: () => true,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      return null;
    }

    render(<Harness />);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(`ws://${window.location.host}/api/ws`);
  });

  it('stays offline and skips socket creation when the websocket url is missing', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => '',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    const { useWebSocket, useWebSocketStatus } = await import('../useWebSocket');

    function Harness() {
      useWebSocket();
      const status = useWebSocketStatus();
      return <div>{status}</div>;
    }

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByText('offline')).toBeTruthy();
    });
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith('[WS] WebSocket URL is not configured, skipping connect');
  });

  it('stops reconnecting and emits auth loss when the server closes with an auth error', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();

    vi.useFakeTimers();

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => 'ws://127.0.0.1:4000/api/ws',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    try {
      const { useWebSocket, useWebSocketStatus } = await import('../useWebSocket');

      function Harness() {
        useWebSocket();
        const status = useWebSocketStatus();
        return <div>{status}</div>;
      }

      render(<Harness />);

      const socket = MockWebSocket.instances[0];
      socket.readyState = MockWebSocket.OPEN;
      await act(async () => {
        socket.onopen?.(new Event('open'));
      });

      await act(async () => {
        socket.onclose?.(Object.assign(new Event('close'), { code: 4001, reason: 'Unauthorized' }));
        vi.advanceTimersByTime(60_000);
      });

      expect(clearSessionToken).toHaveBeenCalledTimes(1);
      expect(emitAuthSessionLost).toHaveBeenCalledWith(4001);
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(screen.getByText('idle')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not emit websocket console logs in production mode', async () => {
    const currentUser = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
    };
    vi.stubEnv('NODE_ENV', 'production');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.doMock('@/stores/auth', () => ({
      useAuthStore: createAuthStoreMock(() => currentUser),
    }));
    vi.doMock('@/lib/runtime-config', () => ({
      getWebSocketUrl: () => '',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
      SESSION_TOKEN_CHANGED_EVENT: 'zktalk-session-token-changed',
    }));

    try {
      const { useWebSocket } = await import('../useWebSocket');

      function Harness() {
        useWebSocket();
        return null;
      }

      render(<Harness />);

      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(0);
      });

      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
