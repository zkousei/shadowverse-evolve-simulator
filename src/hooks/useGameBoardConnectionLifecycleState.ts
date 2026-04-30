import React from 'react';
import type { DataConnection } from 'peerjs';

type UseGameBoardConnectionLifecycleStateArgs = {
  activeConnectionTokenRef: React.RefObject<string | null>;
  awaitingInitialSnapshotRef: React.RefObject<boolean>;
  clearPendingSnapshotMessage: () => void;
  clearReconnectTimer: () => void;
  clearSnapshotRequestTimer: () => void;
  connRef: React.RefObject<DataConnection | null>;
  spectatorConnectionsRef: React.RefObject<Map<string, DataConnection>>;
  setSpectatorCount: React.Dispatch<React.SetStateAction<number>>;
};

export const useGameBoardConnectionLifecycleState = ({
  activeConnectionTokenRef,
  awaitingInitialSnapshotRef,
  clearPendingSnapshotMessage,
  clearReconnectTimer,
  clearSnapshotRequestTimer,
  connRef,
  spectatorConnectionsRef,
  setSpectatorCount,
}: UseGameBoardConnectionLifecycleStateArgs) => {
  const updateSpectatorCount = React.useCallback(() => {
    setSpectatorCount(spectatorConnectionsRef.current.size);
  }, [setSpectatorCount, spectatorConnectionsRef]);

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
    spectatorConnectionsRef.current.clear();
    updateSpectatorCount();
  }, [spectatorConnectionsRef, updateSpectatorCount]);

  const removeSpectatorConnection = React.useCallback((token: string, conn: DataConnection) => {
    if (spectatorConnectionsRef.current.get(token) !== conn) return;

    spectatorConnectionsRef.current.delete(token);
    updateSpectatorCount();
  }, [spectatorConnectionsRef, updateSpectatorCount]);

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
    spectatorConnectionsRef.current.set(token, conn);
    updateSpectatorCount();
  }, [spectatorConnectionsRef, updateSpectatorCount]);

  return {
    clearActiveConnectionLifecycleState,
    clearSpectatorConnectionLifecycleState,
    removeSpectatorConnection,
    prepareActiveConnection,
    prepareSpectatorConnection,
  };
};
