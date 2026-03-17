import { type CardInstance } from '../components/Card';

export type PlayerRole = 'host' | 'guest';

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
  revision: number;
}

export const initialState: SyncState = {
  host: { hp: 20, pp: 0, maxPp: 0, ep: 0, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
  guest: { hp: 20, pp: 0, maxPp: 0, ep: 3, sep: 1, combo: 0, initialHandDrawn: false, mulliganUsed: false, isReady: false },
  cards: [],
  turnPlayer: 'host',
  turnCount: 1,
  phase: 'Start',
  gameStatus: 'preparing',
  revision: 0
};
