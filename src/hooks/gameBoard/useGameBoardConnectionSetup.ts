import React from 'react';
import type { DataConnection } from 'peerjs';
import type { SyncMessage } from '../../types/sync';
import { getPeerIncomingConnectionDecision } from '../../utils/gameBoard/network/gameBoardPeerIncomingConnection';
import { MAX_SPECTATOR_CONNECTIONS } from '../../utils/gameBoard/gameBoardSpectators';

type ConnectionRole = 'guest' | 'spectator';

type DataConnectionWithMetadata = DataConnection & {
  metadata?: {
    connectionRole?: ConnectionRole;
    capabilities?: string[];
    clientSessionId?: string;
    connectionAttempt?: number;
    protocolVersion?: number;
  };
};

const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 30_000;
const CONNECTION_OPEN_TIMEOUT_MS = 10_000;
const HEARTBEAT_CAPABILITY = 'heartbeat-v1';

type UseGameBoardConnectionSetupArgs = {
  connRef: React.RefObject<DataConnection | null>;
  handleConnectionLifecycleEvent: (token: string, kind: 'close' | 'error') => void;
  handleConnectionOpen: (conn: DataConnection, token: string) => void;
  handleIncomingConnectionData: (conn: DataConnection, token: string, rawData: unknown) => void;
  handleIncomingSpectatorConnectionData: (conn: DataConnection, token: string, rawData: unknown) => void;
  isActiveSpectatorConnectionToken: (token: string) => boolean;
  isHost: boolean;
  markSpectatorConnectionOpen: (token: string, conn: DataConnection) => void;
  prepareActiveConnection: (conn: DataConnection, token: string) => void;
  pruneInactiveSpectatorConnections: () => void;
  removeSpectatorConnection: (token: string, conn: DataConnection) => void;
  prepareSpectatorConnection: (conn: DataConnection, token: string) => void;
  spectatorConnectionsRef: React.RefObject<Map<string, DataConnection>>;
  uuidFactory: () => string;
};

export const useGameBoardConnectionSetup = ({
  connRef,
  handleConnectionLifecycleEvent,
  handleConnectionOpen,
  handleIncomingConnectionData,
  handleIncomingSpectatorConnectionData,
  isActiveSpectatorConnectionToken,
  isHost,
  markSpectatorConnectionOpen,
  prepareActiveConnection,
  pruneInactiveSpectatorConnections,
  removeSpectatorConnection,
  prepareSpectatorConnection,
  spectatorConnectionsRef,
  uuidFactory,
}: UseGameBoardConnectionSetupArgs) => {
  const activeGuestSessionIdRef = React.useRef<string | null>(null);
  const highestGuestConnectionAttemptRef = React.useRef(-1);
  const healthIntervalsRef = React.useRef(new Map<string, ReturnType<typeof setInterval>>());
  const healthTimeoutsRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearConnectionHealth = React.useCallback((token: string) => {
    const interval = healthIntervalsRef.current.get(token);
    const timeout = healthTimeoutsRef.current.get(token);
    if (interval) clearInterval(interval);
    if (timeout) clearTimeout(timeout);
    healthIntervalsRef.current.delete(token);
    healthTimeoutsRef.current.delete(token);
  }, []);

  const clearPendingHealthTimeouts = React.useCallback(() => {
    healthTimeoutsRef.current.forEach(clearTimeout);
    healthTimeoutsRef.current.clear();
  }, []);

  const startConnectionHealth = React.useCallback((conn: DataConnection, token: string) => {
    if (healthIntervalsRef.current.has(token)) return;

    healthIntervalsRef.current.set(token, setInterval(() => {
      if (!conn.open || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
        const pendingTimeout = healthTimeoutsRef.current.get(token);
        if (pendingTimeout) clearTimeout(pendingTimeout);
        healthTimeoutsRef.current.delete(token);
        return;
      }

      if (healthTimeoutsRef.current.has(token)) return;

      try {
        conn.send({ type: 'CONNECTION_HEARTBEAT', sentAt: Date.now() } satisfies SyncMessage);
      } catch {
        conn.close();
        return;
      }

      healthTimeoutsRef.current.set(token, setTimeout(() => {
        healthTimeoutsRef.current.delete(token);
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (conn.open) conn.close();
      }, HEARTBEAT_TIMEOUT_MS));
    }, HEARTBEAT_INTERVAL_MS));
  }, []);

  const handleConnectionHealthMessage = React.useCallback((
    conn: DataConnection,
    token: string,
    rawData: unknown
  ) => {
    const data = rawData as Partial<SyncMessage>;
    if (data.type === 'CONNECTION_CAPABILITIES' && data.heartbeat === true) {
      startConnectionHealth(conn, token);
      return true;
    }

    if (data.type === 'CONNECTION_HEARTBEAT' && typeof data.sentAt === 'number') {
      try {
        conn.send({ type: 'CONNECTION_HEARTBEAT_ACK', sentAt: data.sentAt } satisfies SyncMessage);
      } catch {
        conn.close();
      }
      return true;
    }

    if (data.type === 'CONNECTION_HEARTBEAT_ACK') {
      const pendingTimeout = healthTimeoutsRef.current.get(token);
      if (pendingTimeout) clearTimeout(pendingTimeout);
      healthTimeoutsRef.current.delete(token);
      return true;
    }

    const pendingTimeout = healthTimeoutsRef.current.get(token);
    if (pendingTimeout) clearTimeout(pendingTimeout);
    healthTimeoutsRef.current.delete(token);
    return false;
  }, [startConnectionHealth]);

  React.useEffect(() => () => {
    healthIntervalsRef.current.forEach(clearInterval);
    healthTimeoutsRef.current.forEach(clearTimeout);
    healthIntervalsRef.current.clear();
    healthTimeoutsRef.current.clear();
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearPendingHealthTimeouts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clearPendingHealthTimeouts]);

  const setupConnection = React.useCallback((conn: DataConnection) => {
    const token = uuidFactory();
    const metadata = (conn as DataConnectionWithMetadata).metadata;
    const supportsHeartbeat = isHost && metadata?.capabilities?.includes(HEARTBEAT_CAPABILITY);
    const clientSessionId = metadata?.clientSessionId;
    const connectionAttempt = metadata?.connectionAttempt;
    if (!isHost) {
      prepareActiveConnection(conn, token);
    }
    const openTimeout = setTimeout(() => {
      if (!conn.open) conn.close();
    }, CONNECTION_OPEN_TIMEOUT_MS);
    conn.on('open', () => {
      clearTimeout(openTimeout);
      if (isHost) {
        if (
          typeof clientSessionId === 'string'
          && typeof connectionAttempt === 'number'
          && (
            activeGuestSessionIdRef.current !== clientSessionId
            || connectionAttempt < highestGuestConnectionAttemptRef.current
          )
        ) {
          conn.close();
          return;
        }
        prepareActiveConnection(conn, token);
      }
      if (supportsHeartbeat) {
        try {
          conn.send({ type: 'CONNECTION_CAPABILITIES', heartbeat: true } satisfies SyncMessage);
          startConnectionHealth(conn, token);
        } catch {
          conn.close();
          return;
        }
      }
      handleConnectionOpen(conn, token);
    });
    conn.on('data', (rawData: unknown) => {
      if (handleConnectionHealthMessage(conn, token, rawData)) return;
      handleIncomingConnectionData(conn, token, rawData);
    });
    conn.on('close', () => {
      clearTimeout(openTimeout);
      clearConnectionHealth(token);
      handleConnectionLifecycleEvent(token, 'close');
    });
    conn.on('error', () => {
      clearTimeout(openTimeout);
      clearConnectionHealth(token);
      handleConnectionLifecycleEvent(token, 'error');
    });
  }, [
    clearConnectionHealth,
    handleConnectionLifecycleEvent,
    handleConnectionOpen,
    handleConnectionHealthMessage,
    handleIncomingConnectionData,
    isHost,
    prepareActiveConnection,
    startConnectionHealth,
    uuidFactory,
  ]);

  const handleSpectatorConnectionLifecycleEvent = React.useCallback((conn: DataConnection, token: string) => {
    if (!isActiveSpectatorConnectionToken(token)) return;
    clearConnectionHealth(token);
    removeSpectatorConnection(token, conn);
  }, [clearConnectionHealth, isActiveSpectatorConnectionToken, removeSpectatorConnection]);

  const setupSpectatorConnection = React.useCallback((conn: DataConnection) => {
    pruneInactiveSpectatorConnections();

    if (spectatorConnectionsRef.current.size >= MAX_SPECTATOR_CONNECTIONS) {
      conn.close();
      return;
    }

    const token = uuidFactory();
    const metadata = (conn as DataConnectionWithMetadata).metadata;
    const supportsHeartbeat = metadata?.capabilities?.includes(HEARTBEAT_CAPABILITY);
    prepareSpectatorConnection(conn, token);
    const openTimeout = setTimeout(() => {
      if (!conn.open) conn.close();
    }, CONNECTION_OPEN_TIMEOUT_MS);
    conn.on('open', () => {
      clearTimeout(openTimeout);
      if (supportsHeartbeat) {
        try {
          conn.send({ type: 'CONNECTION_CAPABILITIES', heartbeat: true } satisfies SyncMessage);
          startConnectionHealth(conn, token);
        } catch {
          conn.close();
          return;
        }
      }
      markSpectatorConnectionOpen(token, conn);
    });
    conn.on('data', (rawData: unknown) => {
      if (handleConnectionHealthMessage(conn, token, rawData)) return;
      const data = rawData as SyncMessage;
      if (data.type === 'SPECTATOR_LEAVE') {
        removeSpectatorConnection(token, conn);
        return;
      }

      handleIncomingSpectatorConnectionData(conn, token, rawData);
    });
    conn.on('close', () => {
      clearTimeout(openTimeout);
      handleSpectatorConnectionLifecycleEvent(conn, token);
    });
    conn.on('error', () => {
      clearTimeout(openTimeout);
      handleSpectatorConnectionLifecycleEvent(conn, token);
    });
  }, [
    handleIncomingSpectatorConnectionData,
    handleConnectionHealthMessage,
    handleSpectatorConnectionLifecycleEvent,
    markSpectatorConnectionOpen,
    prepareSpectatorConnection,
    pruneInactiveSpectatorConnections,
    removeSpectatorConnection,
    spectatorConnectionsRef,
    startConnectionHealth,
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

      const metadata = (conn as DataConnectionWithMetadata).metadata;
      const clientSessionId = metadata?.clientSessionId;
      const connectionAttempt = metadata?.connectionAttempt;
      const hasVersionedAttempt = typeof clientSessionId === 'string'
        && typeof connectionAttempt === 'number'
        && Number.isSafeInteger(connectionAttempt)
        && connectionAttempt >= 0;

      if (hasVersionedAttempt) {
        const hasOpenConnection = Boolean(connRef.current?.open);
        if (
          hasOpenConnection
          && activeGuestSessionIdRef.current
          && activeGuestSessionIdRef.current !== clientSessionId
        ) {
          conn.close();
          return;
        }

        if (
          activeGuestSessionIdRef.current === clientSessionId
          && connectionAttempt <= highestGuestConnectionAttemptRef.current
        ) {
          conn.close();
          return;
        }

        if (!hasOpenConnection && activeGuestSessionIdRef.current !== clientSessionId) {
          highestGuestConnectionAttemptRef.current = -1;
        }
        activeGuestSessionIdRef.current = clientSessionId;
        highestGuestConnectionAttemptRef.current = connectionAttempt;
      }

      setupConnection(conn);
    }
  }, [connRef, isHost, setupConnection, setupSpectatorConnection]);

  return {
    setupConnection,
    handlePeerIncomingConnection,
  };
};
