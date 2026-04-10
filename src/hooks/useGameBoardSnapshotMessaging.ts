import React from 'react';
import type { DataConnection } from 'peerjs';
import type { SyncMessage } from '../types/sync';
import { mergeQueuedSnapshotMessage, shouldDeferSnapshotMessageSend } from '../utils/gameBoardSnapshotQueue';

const SNAPSHOT_FLUSH_INTERVAL_MS = 50;

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

type UseGameBoardSnapshotMessagingArgs = {
  connRef: React.RefObject<DataConnection | null>;
  spectatorConnRef: React.RefObject<DataConnection | null>;
};

export const useGameBoardSnapshotMessaging = ({
  connRef,
  spectatorConnRef,
}: UseGameBoardSnapshotMessagingArgs) => {
  const snapshotFlushTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotMessageRef = React.useRef<SnapshotMessage | null>(null);
  const flushPendingSnapshotMessageRef = React.useRef<(() => void) | null>(null);

  const clearSnapshotFlushTimer = React.useCallback(() => {
    if (snapshotFlushTimeoutRef.current) {
      clearTimeout(snapshotFlushTimeoutRef.current);
      snapshotFlushTimeoutRef.current = null;
    }
  }, []);

  const clearPendingSnapshotMessage = React.useCallback(() => {
    pendingSnapshotMessageRef.current = null;
    clearSnapshotFlushTimer();
  }, [clearSnapshotFlushTimer]);

  const sendImmediate = React.useCallback((message: SyncMessage) => {
    if (!connRef.current?.open) return;
    connRef.current.send(message);
  }, [connRef]);

  const sendSpectatorImmediate = React.useCallback((message: SyncMessage) => {
    if (!spectatorConnRef.current?.open) return;
    spectatorConnRef.current.send(message);
  }, [spectatorConnRef]);

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
      return;
    }

    const pendingSnapshot = pendingSnapshotMessageRef.current;
    if (!pendingSnapshot) return;

    if (shouldDeferSnapshotMessageSend(conn)) {
      scheduleSnapshotFlush(() => {
        flushPendingSnapshotMessageRef.current?.();
      });
      return;
    }

    pendingSnapshotMessageRef.current = null;
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
