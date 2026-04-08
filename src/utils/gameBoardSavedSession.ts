import type { SyncState } from '../types/game';

export type SavedHostSession = {
  room: string;
  savedAt: string;
  appVersion: string;
  state: SyncState;
};

export type SavedHostSessionPersistenceDecision =
  | { type: 'skip' }
  | { type: 'remove'; storageKey: string }
  | { type: 'persist'; storageKey: string; payload: SavedHostSession };

const isPlayerHud = (value: unknown): value is SyncState['host'] => (
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SyncState['host']).hp === 'number' &&
  typeof (value as SyncState['host']).pp === 'number' &&
  typeof (value as SyncState['host']).maxPp === 'number' &&
  typeof (value as SyncState['host']).ep === 'number' &&
  typeof (value as SyncState['host']).sep === 'number' &&
  typeof (value as SyncState['host']).combo === 'number' &&
  typeof (value as SyncState['host']).initialHandDrawn === 'boolean' &&
  typeof (value as SyncState['host']).mulliganUsed === 'boolean' &&
  typeof (value as SyncState['host']).isReady === 'boolean'
);

const isSyncState = (value: unknown): value is SyncState => (
  typeof value === 'object' &&
  value !== null &&
  isPlayerHud((value as SyncState).host) &&
  isPlayerHud((value as SyncState).guest) &&
  Array.isArray((value as SyncState).cards) &&
  ((value as SyncState).turnPlayer === 'host' || (value as SyncState).turnPlayer === 'guest') &&
  typeof (value as SyncState).turnCount === 'number' &&
  ['Start', 'Main', 'End'].includes((value as SyncState).phase) &&
  ['preparing', 'playing'].includes((value as SyncState).gameStatus) &&
  typeof (value as SyncState).tokenOptions === 'object' &&
  (value as SyncState).tokenOptions !== null &&
  Array.isArray((value as SyncState).tokenOptions.host) &&
  Array.isArray((value as SyncState).tokenOptions.guest) &&
  typeof (value as SyncState).revision === 'number'
);

const isEndStopState = (value: unknown): value is SyncState['endStop'] => (
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SyncState['endStop']).host === 'boolean' &&
  typeof (value as SyncState['endStop']).guest === 'boolean'
);

const normalizeSyncState = (state: SyncState): SyncState => ({
  ...state,
  endStop: isEndStopState((state as SyncState & { endStop?: unknown }).endStop)
    ? state.endStop
    : { host: false, guest: false },
});

const isInitialPlayerHud = (hud: SyncState['host']): boolean => (
  hud.hp === 20 &&
  hud.pp === 0 &&
  hud.maxPp === 0 &&
  hud.ep === 0 &&
  hud.sep === 1 &&
  hud.combo === 0 &&
  hud.initialHandDrawn === false &&
  hud.mulliganUsed === false &&
  hud.isReady === false
);

const isInitialGuestHud = (hud: SyncState['guest']): boolean => (
  hud.hp === 20 &&
  hud.pp === 0 &&
  hud.maxPp === 0 &&
  hud.ep === 3 &&
  hud.sep === 1 &&
  hud.combo === 0 &&
  hud.initialHandDrawn === false &&
  hud.mulliganUsed === false &&
  hud.isReady === false
);

export const getHostSessionStorageKey = (room: string) => `sv-evolve:host-session:${room}`;

export const buildSavedHostSessionPayload = (
  room: string,
  appVersion: string,
  state: SyncState,
  savedAt: string
): SavedHostSession => ({
  room,
  savedAt,
  appVersion,
  state,
});

export const getSavedHostSessionPersistenceDecision = ({
  hasCheckedSavedSession,
  isSoloMode,
  isHost,
  room,
  savedSessionCandidate,
  state,
  appVersion,
  savedAt,
}: {
  hasCheckedSavedSession: boolean;
  isSoloMode: boolean;
  isHost: boolean;
  room: string;
  savedSessionCandidate: SavedHostSession | null;
  state: SyncState;
  appVersion: string;
  savedAt: string;
}): SavedHostSessionPersistenceDecision => {
  if (!hasCheckedSavedSession || isSoloMode || !isHost || !room) {
    return { type: 'skip' };
  }

  if (savedSessionCandidate) {
    return { type: 'skip' };
  }

  const storageKey = getHostSessionStorageKey(room);
  if (!hasMeaningfulGameSessionState(state)) {
    return {
      type: 'remove',
      storageKey,
    };
  }

  return {
    type: 'persist',
    storageKey,
    payload: buildSavedHostSessionPayload(room, appVersion, state, savedAt),
  };
};

export const parseSavedHostSession = (
  rawValue: string | null,
  room: string,
  appVersion: string
): SavedHostSession | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<SavedHostSession>;
    if (!parsed || parsed.room !== room) return null;
    if (parsed.appVersion !== appVersion) return null;
    if (typeof parsed.savedAt !== 'string') return null;
    if (!isSyncState(parsed.state)) return null;

    return {
      room: parsed.room,
      savedAt: parsed.savedAt,
      appVersion: parsed.appVersion,
      state: normalizeSyncState(parsed.state),
    };
  } catch {
    return null;
  }
};

export const hasMeaningfulGameSessionState = (state: SyncState): boolean => {
  const endStop = isEndStopState((state as SyncState & { endStop?: unknown }).endStop)
    ? state.endStop
    : { host: false, guest: false };
  if (state.cards.length > 0) return true;
  if (state.phase !== 'Start') return true;
  if (state.turnPlayer !== 'host') return true;
  if (state.turnCount !== 1) return true;
  if (state.gameStatus !== 'preparing') return true;
  if (state.revealHandsMode) return true;
  if (endStop.host || endStop.guest) return true;
  if (state.tokenOptions.host.length > 0 || state.tokenOptions.guest.length > 0) return true;
  if (!isInitialPlayerHud(state.host)) return true;
  if (!isInitialGuestHud(state.guest)) return true;
  return false;
};
