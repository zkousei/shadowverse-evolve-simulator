import { type CardInstance } from '../components/Card';
import type { RuntimeBaseCardType } from '../utils/cardType';

export type PlayerRole = 'host' | 'guest';
export interface TokenOption {
  cardId: string;
  name: string;
  image: string;
  baseCardType?: RuntimeBaseCardType | null;
  cardKindNormalized?: string;
}

export interface PlayerHUD {
  hp: number;
  pp: number;
  maxPp: number;
  ep: number;
  sep: number;
  combo: number;
  initialHandDrawn: boolean;
  mulliganUsed: boolean;
  isReady: boolean;
}

export interface SyncState {
  host: PlayerHUD;
  guest: PlayerHUD;
  cards: CardInstance[]; // all cards in play
  turnPlayer: PlayerRole;
  turnCount: number;
  phase: 'Start' | 'Main' | 'End';
  gameStatus: 'preparing' | 'playing';
  tokenOptions: Record<PlayerRole, TokenOption[]>;
  revealHandsMode: boolean;
  endStop: Record<PlayerRole, boolean>;
  revision: number;
  lastGameState?: Omit<SyncState, 'lastGameState' | 'lastUndoableCardMoveState' | 'lastUndoableCardMoveActor'> | null;
  lastUndoableCardMoveState?: Omit<SyncState, 'lastGameState' | 'lastUndoableCardMoveState' | 'lastUndoableCardMoveActor'> | null;
  lastUndoableCardMoveActor?: PlayerRole | null;
  networkHasUndoableTurn?: boolean;
  networkHasUndoableCardMove?: boolean;
}

export const initialState: SyncState = {
  host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
  guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
  cards: [],
  turnPlayer: 'host',
  turnCount: 1,
  phase: 'Start',
  gameStatus: 'preparing',
  tokenOptions: {
    host: [],
    guest: [],
  },
  revealHandsMode: false,
  endStop: {
    host: false,
    guest: false,
  },
  revision: 0,
  lastGameState: null,
  lastUndoableCardMoveState: null,
  lastUndoableCardMoveActor: null,
  networkHasUndoableTurn: false,
  networkHasUndoableCardMove: false,
};
