import React from 'react';
import type { DataConnection } from 'peerjs';

type UseGameBoardConnectionLifecycleStateArgs = {
  activeConnectionTokenRef: React.RefObject<string | null>;
  activeSpectatorConnectionTokenRef: React.RefObject<string | null>;
  awaitingInitialSnapshotRef: React.RefObject<boolean>;
  clearPendingSnapshotMessage: () => void;
  clearReconnectTimer: () => void;
  clearSnapshotRequestTimer: () => void;
  connRef: React.RefObject<DataConnection | null>;
  spectatorConnRef: React.RefObject<DataConnection | null>;
};

export const useGameBoardConnectionLifecycleState = ({
  activeConnectionTokenRef,
  activeSpectatorConnectionTokenRef,
  awaitingInitialSnapshotRef,
  clearPendingSnapshotMessage,
  clearReconnectTimer,
  clearSnapshotRequestTimer,
  connRef,
  spectatorConnRef,
}: UseGameBoardConnectionLifecycleStateArgs) => {
  const clearActiveConnectionLifecycleState = React.useCallback(() => {
    connRef.current = null;
    activeConnectionTokenRef.current = null;
    clearPendingSnapshotMessage();
    clearSnapshotRequestTimer();
    awaitingInitialSnapshotRef.current = false;
  }, [
    activeConnectionTokenRef,
    awaitingInitialSnapshotRef,
    clearPendingSnapshotMessage,
    clearSnapshotRequestTimer,
    connRef,
  ]);

  const clearSpectatorConnectionLifecycleState = React.useCallback(() => {
    spectatorConnRef.current = null;
    activeSpectatorConnectionTokenRef.current = null;
  }, [activeSpectatorConnectionTokenRef, spectatorConnRef]);

  const prepareActiveConnection = React.useCallback((conn: DataConnection, token: string) => {
    activeConnectionTokenRef.current = token;
    clearReconnectTimer();
    clearSnapshotRequestTimer();

    if (connRef.current && connRef.current !== conn) {
      try {
        connRef.current.close();
      } catch {
        // Ignore close races on replaced connections.
      }
    }

    clearPendingSnapshotMessage();
    connRef.current = conn;
  }, [
    activeConnectionTokenRef,
    clearPendingSnapshotMessage,
    clearReconnectTimer,
    clearSnapshotRequestTimer,
    connRef,
  ]);

  const prepareSpectatorConnection = React.useCallback((conn: DataConnection, token: string) => {
    activeSpectatorConnectionTokenRef.current = token;

    if (spectatorConnRef.current && spectatorConnRef.current !== conn) {
      try {
        spectatorConnRef.current.close();
      } catch {
        // Ignore close races on replaced spectator connections.
      }
    }

    spectatorConnRef.current = conn;
  }, [activeSpectatorConnectionTokenRef, spectatorConnRef]);

  return {
    clearActiveConnectionLifecycleState,
    clearSpectatorConnectionLifecycleState,
    prepareActiveConnection,
    prepareSpectatorConnection,
  };
};
