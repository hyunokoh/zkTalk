import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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
