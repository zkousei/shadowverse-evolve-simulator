import React from 'react';
import type { DataConnection } from 'peerjs';
import { getPeerIncomingConnectionDecision } from '../utils/gameBoardPeerIncomingConnection';
import { MAX_SPECTATOR_CONNECTIONS } from '../utils/gameBoardSpectators';

type ConnectionRole = 'guest' | 'spectator';

type DataConnectionWithMetadata = DataConnection & {
  metadata?: {
    connectionRole?: ConnectionRole;
  };
};

type UseGameBoardConnectionSetupArgs = {
  handleConnectionLifecycleEvent: (token: string, kind: 'close' | 'error') => void;
  handleConnectionOpen: (conn: DataConnection, token: string) => void;
  handleIncomingConnectionData: (conn: DataConnection, token: string, rawData: unknown) => void;
  handleIncomingSpectatorConnectionData: (conn: DataConnection, token: string, rawData: unknown) => void;
  isActiveSpectatorConnectionToken: (token: string) => boolean;
  isHost: boolean;
  prepareActiveConnection: (conn: DataConnection, token: string) => void;
  removeSpectatorConnection: (token: string, conn: DataConnection) => void;
  prepareSpectatorConnection: (conn: DataConnection, token: string) => void;
  spectatorConnectionsRef: React.RefObject<Map<string, DataConnection>>;
  uuidFactory: () => string;
};

export const useGameBoardConnectionSetup = ({
  handleConnectionLifecycleEvent,
  handleConnectionOpen,
  handleIncomingConnectionData,
  handleIncomingSpectatorConnectionData,
  isActiveSpectatorConnectionToken,
  isHost,
  prepareActiveConnection,
  removeSpectatorConnection,
  prepareSpectatorConnection,
  spectatorConnectionsRef,
  uuidFactory,
}: UseGameBoardConnectionSetupArgs) => {
  const setupConnection = React.useCallback((conn: DataConnection) => {
    const token = uuidFactory();
    prepareActiveConnection(conn, token);
    conn.on('open', () => {
      handleConnectionOpen(conn, token);
    });
    conn.on('data', (rawData: unknown) => {
      handleIncomingConnectionData(conn, token, rawData);
    });
    conn.on('close', () => {
      handleConnectionLifecycleEvent(token, 'close');
    });
    conn.on('error', () => {
      handleConnectionLifecycleEvent(token, 'error');
    });
  }, [
    handleConnectionLifecycleEvent,
    handleConnectionOpen,
    handleIncomingConnectionData,
    prepareActiveConnection,
    uuidFactory,
  ]);

  const handleSpectatorConnectionLifecycleEvent = React.useCallback((conn: DataConnection, token: string) => {
    if (!isActiveSpectatorConnectionToken(token)) return;
    removeSpectatorConnection(token, conn);
  }, [isActiveSpectatorConnectionToken, removeSpectatorConnection]);

  const setupSpectatorConnection = React.useCallback((conn: DataConnection) => {
    if (spectatorConnectionsRef.current.size >= MAX_SPECTATOR_CONNECTIONS) {
      conn.close();
      return;
    }

    const token = uuidFactory();
    prepareSpectatorConnection(conn, token);
    conn.on('data', (rawData: unknown) => {
      handleIncomingSpectatorConnectionData(conn, token, rawData);
    });
    conn.on('close', () => {
      handleSpectatorConnectionLifecycleEvent(conn, token);
    });
    conn.on('error', () => {
      handleSpectatorConnectionLifecycleEvent(conn, token);
    });
  }, [
    handleIncomingSpectatorConnectionData,
    handleSpectatorConnectionLifecycleEvent,
    prepareSpectatorConnection,
    spectatorConnectionsRef,
    uuidFactory,
  ]);

  const handlePeerIncomingConnection = React.useCallback((conn: DataConnection) => {
    const incomingConnectionDecision = getPeerIncomingConnectionDecision({ isHost });

    if (incomingConnectionDecision.type === 'setup-connection') {
      const connectionRole = (conn as DataConnectionWithMetadata).metadata?.connectionRole === 'spectator'
        ? 'spectator'
        : 'guest';

      if (connectionRole === 'spectator') {
        setupSpectatorConnection(conn);
        return;
      }

      setupConnection(conn);
    }
  }, [isHost, setupConnection, setupSpectatorConnection]);

  return {
    setupConnection,
    handlePeerIncomingConnection,
  };
};
