import React from 'react';
import type { DataConnection } from 'peerjs';
import type { SyncMessage } from '../../types/sync';
import { mergeQueuedSnapshotMessage, shouldDeferSnapshotMessageSend } from '../../utils/gameBoard/snapshot/gameBoardSnapshotQueue';

const SNAPSHOT_FLUSH_INTERVAL_MS = 50;
const SNAPSHOT_FLUSH_TIMEOUT_MS = 30_000;

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

type UseGameBoardSnapshotMessagingArgs = {
  connRef: React.RefObject<DataConnection | null>;
  spectatorConnectionsRef: React.RefObject<Map<string, DataConnection>>;
};

export const useGameBoardSnapshotMessaging = ({
  connRef,
  spectatorConnectionsRef,
}: UseGameBoardSnapshotMessagingArgs) => {
  const snapshotFlushTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotMessageRef = React.useRef<SnapshotMessage | null>(null);
  const snapshotDeferredSinceRef = React.useRef<number | null>(null);
  const flushPendingSnapshotMessageRef = React.useRef<(() => void) | null>(null);

  const clearSnapshotFlushTimer = React.useCallback(() => {
    if (snapshotFlushTimeoutRef.current) {
      clearTimeout(snapshotFlushTimeoutRef.current);
      snapshotFlushTimeoutRef.current = null;
    }
  }, []);

  const clearPendingSnapshotMessage = React.useCallback(() => {
    pendingSnapshotMessageRef.current = null;
    snapshotDeferredSinceRef.current = null;
    clearSnapshotFlushTimer();
  }, [clearSnapshotFlushTimer]);

  const sendImmediate = React.useCallback((message: SyncMessage) => {
    if (!connRef.current?.open) return;
    try {
      connRef.current.send(message);
    } catch {
      connRef.current.close();
    }
  }, [connRef]);

  const sendSpectatorImmediate = React.useCallback((message: SyncMessage) => {
    spectatorConnectionsRef.current.forEach((spectatorConn) => {
      if (!spectatorConn.open) return;

      try {
        spectatorConn.send(message);
      } catch {
        // Keep broadcasting to the remaining spectators.
      }
    });
  }, [spectatorConnectionsRef]);

  const scheduleSnapshotFlush = React.useCallback((flush: () => void) => {
    snapshotFlushTimeoutRef.current = setTimeout(() => {
      snapshotFlushTimeoutRef.current = null;
      flush();
    }, SNAPSHOT_FLUSH_INTERVAL_MS);
  }, []);

  const flushPendingSnapshotMessage = React.useCallback(() => {
    clearSnapshotFlushTimer();

    const conn = connRef.current;
    if (!conn?.open) {
      pendingSnapshotMessageRef.current = null;
      snapshotDeferredSinceRef.current = null;
      return;
    }

    const pendingSnapshot = pendingSnapshotMessageRef.current;
    if (!pendingSnapshot) {
      snapshotDeferredSinceRef.current = null;
      return;
    }

    if (shouldDeferSnapshotMessageSend(conn)) {
      const deferredSince = snapshotDeferredSinceRef.current ?? Date.now();
      snapshotDeferredSinceRef.current = deferredSince;
      if (Date.now() - deferredSince >= SNAPSHOT_FLUSH_TIMEOUT_MS) {
        pendingSnapshotMessageRef.current = null;
        snapshotDeferredSinceRef.current = null;
        conn.close();
        return;
      }
      scheduleSnapshotFlush(() => {
        flushPendingSnapshotMessageRef.current?.();
      });
      return;
    }

    pendingSnapshotMessageRef.current = null;
    snapshotDeferredSinceRef.current = null;
    sendImmediate(pendingSnapshot);

    if (pendingSnapshotMessageRef.current) {
      scheduleSnapshotFlush(() => {
        flushPendingSnapshotMessageRef.current?.();
      });
    }
  }, [clearSnapshotFlushTimer, connRef, scheduleSnapshotFlush, sendImmediate]);

  React.useEffect(() => {
    flushPendingSnapshotMessageRef.current = flushPendingSnapshotMessage;
  }, [flushPendingSnapshotMessage]);

  const queueOrSendSnapshotMessage = React.useCallback((message: SnapshotMessage) => {
    const conn = connRef.current;
    if (!conn?.open) return;

    const existingSnapshot = pendingSnapshotMessageRef.current;
    if (existingSnapshot) {
      pendingSnapshotMessageRef.current = mergeQueuedSnapshotMessage(existingSnapshot, message);

      if (!snapshotFlushTimeoutRef.current) {
        scheduleSnapshotFlush(() => {
          flushPendingSnapshotMessageRef.current?.();
        });
      }
      return;
    }

    if (shouldDeferSnapshotMessageSend(conn)) {
      pendingSnapshotMessageRef.current = message;
      snapshotDeferredSinceRef.current = Date.now();
      scheduleSnapshotFlush(() => {
        flushPendingSnapshotMessageRef.current?.();
      });
      return;
    }

    sendImmediate(message);
  }, [connRef, scheduleSnapshotFlush, sendImmediate]);

  const sendMessage = React.useCallback((message: SyncMessage) => {
    if (message.type === 'STATE_SNAPSHOT') {
      queueOrSendSnapshotMessage(message);
      sendSpectatorImmediate(message);
      return;
    }

    sendImmediate(message);
    sendSpectatorImmediate(message);
  }, [queueOrSendSnapshotMessage, sendImmediate, sendSpectatorImmediate]);

  React.useEffect(() => {
    return () => {
      clearPendingSnapshotMessage();
    };
  }, [clearPendingSnapshotMessage]);

  return {
    sendMessage,
    clearPendingSnapshotMessage,
  };
};
