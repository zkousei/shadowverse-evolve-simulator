import type { CardInstance } from '../components/Card';
import type { PlayerRole, SyncState } from './game';
import type { TopDeckResult } from '../utils/cardLogic';

export type GameSyncEvent =
  | { id: string; type: 'TOGGLE_READY'; actor: PlayerRole }
  | { id: string; type: 'SET_PHASE'; actor: PlayerRole; phase: SyncState['phase'] }
  | { id: string; type: 'END_TURN'; actor: PlayerRole }
  | { id: string; type: 'START_GAME'; actor: PlayerRole }
  | { id: string; type: 'RESET_GAME'; actor: PlayerRole }
  | { id: string; type: 'MOVE_CARD'; actor: PlayerRole; cardId: string; overId: string }
  | { id: string; type: 'MODIFY_COUNTER'; actor: PlayerRole; cardId: string; stat: 'atk' | 'hp'; delta: number }
  | { id: string; type: 'DRAW_CARD'; actor: PlayerRole }
  | { id: string; type: 'MILL_CARD'; actor: PlayerRole }
  | { id: string; type: 'TOGGLE_TAP'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'TOGGLE_FLIP'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'SEND_TO_BOTTOM'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'BANISH_CARD'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'SEND_TO_CEMETERY'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'RETURN_EVOLVE'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'PLAY_TO_FIELD'; actor: PlayerRole; cardId: string }
  | { id: string; type: 'EXTRACT_CARD'; actor: PlayerRole; cardId: string; destination?: string }
  | { id: string; type: 'SHUFFLE_DECK'; actor: PlayerRole }
  | { id: string; type: 'MODIFY_PLAYER_STAT'; actor: PlayerRole; playerKey: PlayerRole; stat: 'hp' | 'pp' | 'maxPp' | 'ep' | 'sep' | 'combo'; delta: number }
  | { id: string; type: 'DRAW_INITIAL_HAND'; actor: PlayerRole }
  | { id: string; type: 'EXECUTE_MULLIGAN'; actor: PlayerRole; selectedIds: string[] }
  | { id: string; type: 'RESOLVE_TOP_DECK'; actor: PlayerRole; results: TopDeckResult[] }
  | { id: string; type: 'IMPORT_DECK'; actor: PlayerRole; cards: CardInstance[] }
  | { id: string; type: 'SET_INITIAL_TURN_ORDER'; actor: PlayerRole; starter: PlayerRole }
  | { id: string; type: 'UNDO_LAST_TURN'; actor: PlayerRole; previousState: SyncState }
  | { id: string; type: 'SPAWN_TOKEN'; actor: PlayerRole; token: CardInstance };

export type SyncMessage =
  | { type: 'EVENT'; event: GameSyncEvent }
  | { type: 'STATE_SNAPSHOT'; state: SyncState; source: PlayerRole };
