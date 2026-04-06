import type { SyncState, PlayerRole } from '../types/game';
import type { SharedUiEffect, SyncMessage } from '../types/sync';
import type { CardDetailLookup } from './cardDetails';
import { buildGameBoardNetworkSnapshotState } from './gameBoardSnapshot';

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

export const buildSnapshotRequestMessage = (
  lastKnownRevision: number,
  source: PlayerRole
): Extract<SyncMessage, { type: 'REQUEST_SNAPSHOT' }> => ({
  type: 'REQUEST_SNAPSHOT',
  lastKnownRevision,
  source,
});

export const buildWaitingForHostSessionMessage = (): Extract<SyncMessage, { type: 'WAITING_FOR_HOST_SESSION' }> => ({
  type: 'WAITING_FOR_HOST_SESSION',
  source: 'host',
});

export const buildSnapshotSyncMessage = (
  state: SyncState,
  source: PlayerRole,
  detailLookup: CardDetailLookup,
  effects?: SharedUiEffect[]
): SnapshotMessage => ({
  type: 'STATE_SNAPSHOT',
  state: buildGameBoardNetworkSnapshotState(state, detailLookup),
  source,
  pendingEffects: effects?.length ? effects : undefined,
});
