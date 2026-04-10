import React from 'react';
import type { DataConnection } from 'peerjs';
import { getPeerIncomingConnectionDecision } from '../utils/gameBoardPeerIncomingConnection';

type ConnectionRole = 'guest' | 'spectator';

type DataConnectionWithMetadata = DataConnection & {
  metadata?: {
    connectionRole?: ConnectionRole;
  };
};

type UseGameBoardConnectionSetupArgs = {
  clearSpectatorConnectionLifecycleState: () => void;
  handleConnectionLifecycleEvent: (token: string, kind: 'close' | 'error') => void;
  handleConnectionOpen: (conn: DataConnection, token: string) => void;
  handleIncomingConnectionData: (conn: DataConnection, token: string, rawData: unknown) => void;
  handleIncomingSpectatorConnectionData: (conn: DataConnection, token: string, rawData: unknown) => void;
  isActiveSpectatorConnectionToken: (token: string) => boolean;
  isHost: boolean;
  prepareActiveConnection: (conn: DataConnection, token: string) => void;
  prepareSpectatorConnection: (conn: DataConnection, token: string) => void;
  uuidFactory: () => string;
};

export const useGameBoardConnectionSetup = ({
  clearSpectatorConnectionLifecycleState,
  handleConnectionLifecycleEvent,
  handleConnectionOpen,
  handleIncomingConnectionData,
  handleIncomingSpectatorConnectionData,
  isActiveSpectatorConnectionToken,
  isHost,
  prepareActiveConnection,
  prepareSpectatorConnection,
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

  const handleSpectatorConnectionLifecycleEvent = React.useCallback((token: string) => {
    if (!isActiveSpectatorConnectionToken(token)) return;
    clearSpectatorConnectionLifecycleState();
  }, [clearSpectatorConnectionLifecycleState, isActiveSpectatorConnectionToken]);

  const setupSpectatorConnection = React.useCallback((conn: DataConnection) => {
    const token = uuidFactory();
    prepareSpectatorConnection(conn, token);
    conn.on('data', (rawData: unknown) => {
      handleIncomingSpectatorConnectionData(conn, token, rawData);
    });
    conn.on('close', () => {
      handleSpectatorConnectionLifecycleEvent(token);
    });
    conn.on('error', () => {
      handleSpectatorConnectionLifecycleEvent(token);
    });
  }, [
    handleIncomingSpectatorConnectionData,
    handleSpectatorConnectionLifecycleEvent,
    prepareSpectatorConnection,
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
