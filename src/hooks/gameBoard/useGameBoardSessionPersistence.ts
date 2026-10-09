import React from 'react';
import type { SyncState } from '../../types/game';
import {
  getHostSessionStorageKey,
  getSavedHostSessionPersistenceDecision,
  hasMeaningfulGameSessionState,
  parseSavedHostSession,
  persistSavedHostSession,
  type SavedHostSession,
} from '../../utils/gameBoard/gameBoardSavedSession';

type GameBoardStatusKey = `gameBoard.status.${string}`;

type UseGameBoardSessionPersistenceArgs = {
  appVersion: string;
  applyLocalState: (newState: SyncState) => void;
  gameState: SyncState;
  gameStateRef: React.RefObject<SyncState>;
  isHost: boolean;
  isSoloMode: boolean;
  resetTransientUiState: () => void;
  room: string;
  sendSnapshotToCurrentConnection: (state: SyncState, source: 'host' | 'guest') => void;
  setStatusKey: React.Dispatch<React.SetStateAction<GameBoardStatusKey>>;
};

export const useGameBoardSessionPersistence = ({
  appVersion,
  applyLocalState,
  gameState,
  gameStateRef,
  isHost,
  isSoloMode,
  resetTransientUiState,
  room,
  sendSnapshotToCurrentConnection,
  setStatusKey,
}: UseGameBoardSessionPersistenceArgs) => {
  const [savedSessionCandidate, setSavedSessionCandidate] = React.useState<SavedHostSession | null>(null);
  const [hasCheckedSavedSession, setHasCheckedSavedSession] = React.useState(false);
  const savedSessionCandidateRef = React.useRef<SavedHostSession | null>(null);
  const hasCheckedSavedSessionRef = React.useRef(false);

  React.useEffect(() => {
    savedSessionCandidateRef.current = savedSessionCandidate;
  }, [savedSessionCandidate]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      savedSessionCandidateRef.current = null;
      hasCheckedSavedSessionRef.current = true;
      setHasCheckedSavedSession(true);
      setSavedSessionCandidate(null);
      return;
    }

    if (isSoloMode || !isHost || !room) {
      savedSessionCandidateRef.current = null;
      hasCheckedSavedSessionRef.current = true;
      setSavedSessionCandidate(null);
      setHasCheckedSavedSession(true);
      return;
    }

    const storageKey = getHostSessionStorageKey(room);
    const parsed = parseSavedHostSession(window.sessionStorage.getItem(storageKey), room, appVersion);

    if (!parsed || !hasMeaningfulGameSessionState(parsed.state)) {
      window.sessionStorage.removeItem(storageKey);
      savedSessionCandidateRef.current = null;
      hasCheckedSavedSessionRef.current = true;
      setSavedSessionCandidate(null);
      setHasCheckedSavedSession(true);
      return;
    }

    savedSessionCandidateRef.current = parsed;
    hasCheckedSavedSessionRef.current = true;
    setSavedSessionCandidate(parsed);
    setHasCheckedSavedSession(true);
  }, [appVersion, isHost, isSoloMode, room]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const decision = getSavedHostSessionPersistenceDecision({
      hasCheckedSavedSession,
      isSoloMode,
      isHost,
      room,
      savedSessionCandidate,
      state: gameState,
      appVersion,
      savedAt: new Date().toISOString(),
    });

    if (decision.type === 'skip') {
      return;
    }

    if (decision.type === 'remove') {
      window.sessionStorage.removeItem(decision.storageKey);
      return;
    }

    persistSavedHostSession(window.sessionStorage, decision.storageKey, decision.payload);
  }, [appVersion, gameState, hasCheckedSavedSession, isHost, isSoloMode, room, savedSessionCandidate]);

  const resumeSavedSession = React.useCallback(() => {
    if (!savedSessionCandidate) return;

    applyLocalState(savedSessionCandidate.state);
    resetTransientUiState();
    savedSessionCandidateRef.current = null;
    setSavedSessionCandidate(null);
    setStatusKey('gameBoard.status.sessionRestored');
    sendSnapshotToCurrentConnection(savedSessionCandidate.state, 'host');
  }, [
    applyLocalState,
    resetTransientUiState,
    savedSessionCandidate,
    sendSnapshotToCurrentConnection,
    setStatusKey,
  ]);

  const discardSavedSession = React.useCallback(() => {
    if (typeof window !== 'undefined' && room) {
      window.sessionStorage.removeItem(getHostSessionStorageKey(room));
    }

    savedSessionCandidateRef.current = null;
    setSavedSessionCandidate(null);
    setStatusKey('gameBoard.status.startingFresh');
    sendSnapshotToCurrentConnection(gameStateRef.current, 'host');
  }, [gameStateRef, room, sendSnapshotToCurrentConnection, setStatusKey]);

  return {
    savedSessionCandidate,
    savedSessionCandidateRef,
    hasCheckedSavedSession,
    hasCheckedSavedSessionRef,
    resumeSavedSession,
    discardSavedSession,
  };
};
