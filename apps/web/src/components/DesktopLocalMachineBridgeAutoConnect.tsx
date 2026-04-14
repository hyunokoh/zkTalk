'use client';

import { useEffect } from 'react';
import { isDesktopRuntime } from '@/lib/runtime-config';
import {
  disconnectDesktopLocalMachineBridge,
  ensureDesktopLocalMachineBridgeOnline,
} from '@/lib/local-machine-bridge-loopback';

const HEARTBEAT_INTERVAL_MS = 20_000;

export function DesktopLocalMachineBridgeAutoConnect({
  ownerUserId,
}: {
  ownerUserId: string | null | undefined;
}) {
  useEffect(() => {
    if (!isDesktopRuntime() || !ownerUserId) {
      return;
    }

    let disposed = false;

    const syncBridge = async () => {
      try {
        const snapshot = await ensureDesktopLocalMachineBridgeOnline({
          ownerUserId,
        });

        if (disposed || !snapshot) {
          return;
        }
      } catch {
        // Keep auto-connect fail-soft so desktop shell remains usable even if the local bridge is not ready.
      }
    };

    void syncBridge();
    const interval = window.setInterval(() => {
      void syncBridge();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [ownerUserId]);

  useEffect(() => {
    if (!isDesktopRuntime() || ownerUserId) {
      return;
    }

    void disconnectDesktopLocalMachineBridge().catch(() => {
      // Keep auto-disconnect fail-soft so desktop logout cannot break the shell.
    });
  }, [ownerUserId]);

  return null;
}
