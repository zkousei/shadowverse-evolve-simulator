import type { CardInstance } from '../components/Card';
import { initialState, type PlayerRole, type SyncState } from '../types/game';

const DEBUG_DECK_SIZE = 20;

const buildDebugCards = (playerRole: PlayerRole): CardInstance[] =>
  Array.from({ length: DEBUG_DECK_SIZE }, (_, index) => ({
    id: `debug-${playerRole}-${index}`,
    cardId: `debug-card-${index}`,
    name: `Debug Card ${index + 1}`,
    image: '',
    zone: `mainDeck-${playerRole}`,
    owner: playerRole,
    isTapped: false,
    isFlipped: true,
    counters: { atk: 0, hp: 0 },
  }));

export const buildDebugGameBoardState = (): SyncState => ({
  ...initialState,
  cards: [
    ...buildDebugCards('host'),
    ...buildDebugCards('guest'),
  ],
  host: {
    ...initialState.host,
    pp: 1,
    maxPp: 1,
    initialHandDrawn: true,
    isReady: true,
  },
  guest: {
    ...initialState.guest,
    initialHandDrawn: true,
    isReady: true,
  },
  gameStatus: 'playing',
  turnPlayer: 'host',
});
