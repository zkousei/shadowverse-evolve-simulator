import React from 'react';
import type { DataConnection } from 'peerjs';
import type { PlayerRole, SyncState } from '../types/game';
import type { SyncMessage } from '../types/sync';
import type { CardDetailLookup } from '../utils/cardDetails';
import {
  buildSnapshotSyncMessage,
  buildWaitingForHostSessionMessage,
} from '../utils/gameBoardNetworkMessages';
import { getIncomingEventDecision } from '../utils/gameBoardIncomingEvent';
import { getIncomingSnapshotHandling } from '../utils/gameBoardIncomingSnapshot';
import { getSnapshotRequestDecision } from '../utils/gameBoardSnapshotRequest';
import { getWaitingForHostSessionDecision } from '../utils/gameBoardWaitingForHostSession';

type GameBoardStatusKey = `gameBoard.status.${string}`;
type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

type UseGameBoardIncomingMessagesArgs = {
  applyAuthoritativeEvent: (event: Extract<SyncMessage, { type: 'EVENT' }>['event'], requester?: PlayerRole) => void;
  awaitingInitialSnapshotRef: React.RefObject<boolean>;
  cardDetailLookupRef: React.RefObject<CardDetailLookup>;
  clearSnapshotRequestTimer: () => void;
  gameStateRef: React.RefObject<SyncState>;
  isActiveConnectionToken: (token: string) => boolean;
  isActiveSpectatorConnectionToken: (token: string) => boolean;
  isHost: boolean;
  maybeApplySnapshot: (incomingState: SyncState, source: PlayerRole) => boolean;
  playIncomingSharedUiEffects: (
    message: Extract<SyncMessage, { type: 'SHARED_UI_EFFECT' }> | SnapshotMessage
  ) => void;
  reconcileOpenTopDeckCards: (incomingState: SyncState) => void;
  resetTransientUiState: (includingUndo?: boolean) => void;
  savedSessionCandidateRef: React.RefObject<unknown>;
  setStatusKey: React.Dispatch<React.SetStateAction<GameBoardStatusKey>>;
};

export const useGameBoardIncomingMessages = ({
  applyAuthoritativeEvent,
  awaitingInitialSnapshotRef,
  cardDetailLookupRef,
  clearSnapshotRequestTimer,
  gameStateRef,
  isActiveConnectionToken,
  isActiveSpectatorConnectionToken,
  isHost,
  maybeApplySnapshot,
  playIncomingSharedUiEffects,
  reconcileOpenTopDeckCards,
  resetTransientUiState,
  savedSessionCandidateRef,
  setStatusKey,
}: UseGameBoardIncomingMessagesArgs) => {
  const handleIncomingWaitingForHostSession = React.useCallback(() => {
    clearSnapshotRequestTimer();
    const waitingDecision = getWaitingForHostSessionDecision({ isHost });

    if (waitingDecision.type === 'set-status') {
      setStatusKey(waitingDecision.statusKey);
    }
  }, [clearSnapshotRequestTimer, isHost, setStatusKey]);

  const handleIncomingEvent = React.useCallback((message: Extract<SyncMessage, { type: 'EVENT' }>) => {
    const incomingEventDecision = getIncomingEventDecision({ isHost });

    if (incomingEventDecision.type === 'apply') {
      applyAuthoritativeEvent(message.event, incomingEventDecision.source);
    }
  }, [applyAuthoritativeEvent, isHost]);

  const handleIncomingSnapshotRequest = React.useCallback((
    _message: Extract<SyncMessage, { type: 'REQUEST_SNAPSHOT' }>,
    conn: DataConnection
  ) => {
    const snapshotRequestDecision = getSnapshotRequestDecision({
      isHost,
      hasSavedSessionCandidate: Boolean(savedSessionCandidateRef.current),
    });

    if (snapshotRequestDecision.type === 'wait-for-host-session') {
      setStatusKey(snapshotRequestDecision.statusKey);
      conn.send(buildWaitingForHostSessionMessage());
      return;
    }

    if (snapshotRequestDecision.type === 'send-snapshot') {
      conn.send(buildSnapshotSyncMessage(gameStateRef.current, 'host', cardDetailLookupRef.current));
    }
  }, [cardDetailLookupRef, gameStateRef, isHost, savedSessionCandidateRef, setStatusKey]);

  const handleIncomingSnapshot = React.useCallback((message: SnapshotMessage) => {
    const snapshotHandling = getIncomingSnapshotHandling({
      isHost,
      message,
      isAwaitingInitialSnapshot: awaitingInitialSnapshotRef.current,
      currentGameStatus: gameStateRef.current.gameStatus,
    });

    clearSnapshotRequestTimer();
    const didApplySnapshot = maybeApplySnapshot(snapshotHandling.state, snapshotHandling.source);
    playIncomingSharedUiEffects(message);

    if (snapshotHandling.postProcessing.type === 'guest-ready') {
      if (snapshotHandling.postProcessing.shouldResetTransientUi) {
        resetTransientUiState(!snapshotHandling.postProcessing.preserveUndoState);
      } else if (didApplySnapshot) {
        reconcileOpenTopDeckCards(gameStateRef.current);
      }
      setStatusKey(snapshotHandling.postProcessing.statusKey);
    }
  }, [
    awaitingInitialSnapshotRef,
    clearSnapshotRequestTimer,
    gameStateRef,
    isHost,
    maybeApplySnapshot,
    playIncomingSharedUiEffects,
    reconcileOpenTopDeckCards,
    resetTransientUiState,
    setStatusKey,
  ]);

  const handleIncomingConnectionData = React.useCallback((
    conn: DataConnection,
    token: string,
    rawData: unknown
  ) => {
    if (!isActiveConnectionToken(token)) return;
    const data = rawData as SyncMessage;

    if (data.type === 'EVENT') {
      handleIncomingEvent(data);
      return;
    }

    if (data.type === 'REQUEST_SNAPSHOT') {
      handleIncomingSnapshotRequest(data, conn);
      return;
    }

    if (data.type === 'SHARED_UI_EFFECT') {
      playIncomingSharedUiEffects(data);
      return;
    }

    if (data.type === 'WAITING_FOR_HOST_SESSION') {
      handleIncomingWaitingForHostSession();
      return;
    }

    if (data.type === 'STATE_SNAPSHOT') {
      handleIncomingSnapshot(data);
    }
  }, [
    handleIncomingEvent,
    handleIncomingSnapshot,
    handleIncomingSnapshotRequest,
    handleIncomingWaitingForHostSession,
    isActiveConnectionToken,
    playIncomingSharedUiEffects,
  ]);

  const handleIncomingSpectatorConnectionData = React.useCallback((
    conn: DataConnection,
    token: string,
    rawData: unknown
  ) => {
    if (!isActiveSpectatorConnectionToken(token)) return;
    const data = rawData as SyncMessage;

    if (data.type === 'REQUEST_SNAPSHOT') {
      handleIncomingSnapshotRequest(data, conn);
    }
  }, [handleIncomingSnapshotRequest, isActiveSpectatorConnectionToken]);

  return {
    handleIncomingConnectionData,
    handleIncomingSpectatorConnectionData,
  };
};
