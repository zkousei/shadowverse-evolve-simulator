import type { CardInstance } from '../../components/Card';
import type { PlayerRole, SyncState } from '../../types/game';
import type { GameSyncEvent } from '../../types/sync';
import { getCardMoveHistory } from './gameBoardUndoHistory';

const playerStats = ['hp', 'pp', 'maxPp', 'ep', 'sep', 'combo'] as const;
const lookZones = ['hand', 'top', 'bottom', 'field', 'ex', 'cemetery'] as const;
const movementEvents: ReadonlySet<GameSyncEvent['type']> = new Set([
  'MOVE_CARD', 'LINK_CARD_TO_FIELD', 'DRAW_CARD', 'MILL_CARD', 'MOVE_TOP_CARD_TO_EX',
  'MOVE_TOP_CARD_TO_BANISH', 'SEND_TO_BOTTOM', 'SEND_TO_BOTTOM_BATCH', 'BANISH_CARD',
  'BANISH_CARDS_BATCH', 'SEND_TO_CEMETERY', 'SEND_TO_CEMETERY_BATCH',
  'DISCARD_RANDOM_HAND_CARDS', 'RETURN_EVOLVE', 'PLAY_TO_FIELD', 'EXTRACT_CARD', 'EXTRACT_CARDS_BATCH',
]);
const simpleKinds = ['player-stat', 'atk', 'hp', 'counter', 'move', 'orientation', 'face', 'shuffle', 'token', 'attack', 'generic'] as const;
export type UndoDescription = { kind: typeof simpleKinds[number] } | { kind: 'look'; counts: Record<typeof lookZones[number], number> };
type UndoZone = 'hand' | 'deck' | 'evolveDeck' | 'field' | 'ex' | 'cemetery' | 'banish' | 'outside';
export type PublicUndoSummary =
  | { kind: 'generic' | 'orientation' | 'face' | 'shuffle' | 'token' | 'attack' | 'turn' }
  | { kind: 'player-stat'; player: PlayerRole; changes: { stat: typeof playerStats[number]; from: number; to: number }[] }
  | { kind: 'card-stat'; stat: 'atk' | 'hp' | 'counter'; count: number; detail?: { name: string; from: number; to: number } }
  | { kind: 'look'; counts: Record<typeof lookZones[number], number> }
  | { kind: 'move'; moves: { owner: PlayerRole; sourceOwner?: PlayerRole; from: UndoZone; to: UndoZone; count: number }[] };

// Saved metadata is a small allowlist. Never keep events, card IDs or names here.
export const sanitizeUndoDescription = (value: unknown): UndoDescription | undefined => {
  if (!value || typeof value !== 'object' || !('kind' in value)) return undefined;
  if (simpleKinds.includes(value.kind as typeof simpleKinds[number])) return { kind: value.kind as typeof simpleKinds[number] };
  if (value.kind !== 'look' || !('counts' in value) || !value.counts || typeof value.counts !== 'object') return undefined;
  const counts = value.counts as Record<string, unknown>;
  if (!lookZones.every(zone => Number.isSafeInteger(counts[zone]) && Number(counts[zone]) >= 0)) return undefined;
  return { kind: 'look', counts: Object.fromEntries(lookZones.map(zone => [zone, counts[zone]])) as Record<typeof lookZones[number], number> };
};

export const describeUndoOperation = (state: SyncState, event: GameSyncEvent): UndoDescription => {
  if (event.type === 'MODIFY_PLAYER_STAT') return { kind: 'player-stat' };
  if (event.type === 'MODIFY_COUNTER') return { kind: event.stat };
  if (event.type === 'MODIFY_GENERIC_COUNTER') return { kind: 'counter' };
  if (event.type === 'RESOLVE_TOP_DECK') {
    const counts = { hand: 0, top: 0, bottom: 0, field: 0, ex: 0, cemetery: 0 };
    const results = new Map(event.results.map(result => [result.cardId, result]));
    for (const result of results.values()) {
      if (!state.cards.some(card => card.id === result.cardId && card.zone === `mainDeck-${event.actor}`)) continue;
      const zone = result.action === 'revealedHand' ? 'hand' : result.action;
      if (lookZones.includes(zone)) counts[zone] += 1;
    }
    return { kind: 'look', counts };
  }
  if (event.type === 'SHUFFLE_DECK') return { kind: 'shuffle' };
  if (event.type === 'SPAWN_TOKEN' || event.type === 'SPAWN_TOKENS_BATCH') return { kind: 'token' };
  if (event.type === 'ATTACK_DECLARATION') return { kind: 'attack' };
  if (event.type === 'TOGGLE_TAP') return { kind: 'orientation' };
  if (event.type === 'TOGGLE_FLIP' || event.type === 'SET_CARD_FACE') return { kind: 'face' };
  if (event.type === 'BOARD_BATCH') {
    if (/^(atk|hp|counter)[+-]$/.test(event.action)) return { kind: event.action.slice(0, -1) as 'atk' | 'hp' | 'counter' };
    if (event.action === 'rest' || event.action === 'stand') return { kind: 'orientation' };
    return { kind: 'move' };
  }
  // Future operation types must explicitly opt into public summaries.
  return { kind: movementEvents.has(event.type) ? 'move' : 'generic' };
};

const publicFaceUp = (card: CardInstance) => !card.isFlipped && /^(field|ex|cemetery|banish)-(host|guest)$/.test(card.zone);
const zoneOwner = (card: CardInstance | undefined): PlayerRole | undefined =>
  card?.zone.endsWith('-host') ? 'host' : card?.zone.endsWith('-guest') ? 'guest' : undefined;
const zoneLabel = (card: CardInstance | undefined): UndoZone | undefined => {
  if (!card) return 'outside';
  const match = /^(hand|mainDeck|evolveDeck|field|ex|cemetery|banish)-(host|guest)$/.exec(card.zone);
  return match ? match[1] === 'mainDeck' ? 'deck' : match[1] as UndoZone : undefined;
};

export const buildUndoLogEffect = (
  before: SyncState, restored: SyncState, actor: PlayerRole,
): { type: 'UNDO_COMPLETED'; actor: PlayerRole; summary: PublicUndoSummary } | null => {
  const entry = getCardMoveHistory(before).at(-1);
  if (before === restored || restored.revision <= before.revision || entry?.actor !== actor) return null;
  const description = sanitizeUndoDescription(entry.description);
  let summary: PublicUndoSummary = { kind: 'generic' };
  if (description?.kind === 'look') summary = description;
  else if (description?.kind === 'player-stat') {
    const players = (['host', 'guest'] as const).flatMap(player => {
      const changes = playerStats.filter(stat => before[player][stat] !== restored[player][stat])
        .map(stat => ({ stat, from: before[player][stat], to: restored[player][stat] }));
      return changes.length ? [{ player, changes }] : [];
    });
    if (players.length === 1) summary = { kind: 'player-stat', ...players[0] };
  } else if (description && ['atk', 'hp', 'counter'].includes(description.kind)) {
    const stat = description.kind as 'atk' | 'hp' | 'counter';
    const number = (card: CardInstance) => stat === 'counter' ? card.genericCounter ?? 0 : card.counters[stat];
    const changed = restored.cards.flatMap(card => {
      const previous = before.cards.find(previous => previous.id === card.id);
      return previous && number(previous) !== number(card) ? [{ previous, card }] : [];
    });
    if (changed.length) {
      const pair = changed[0];
      summary = { kind: 'card-stat', stat, count: changed.length,
        ...(changed.length === 1 && publicFaceUp(pair.previous) && publicFaceUp(pair.card)
          ? { detail: { name: pair.card.name, from: number(pair.previous), to: number(pair.card) } } : {}) };
    }
  } else if (description?.kind === 'move') {
    const moves = new Map<string, { owner: PlayerRole; sourceOwner?: PlayerRole; from: UndoZone; to: UndoZone; count: number }>();
    let known = true;
    const ids = new Set([...before.cards, ...restored.cards].map(card => card.id));
    for (const id of ids) {
      const previous = before.cards.find(card => card.id === id);
      const card = restored.cards.find(card => card.id === id);
      if (previous?.zone === card?.zone) continue;
      const from = zoneLabel(previous), to = zoneLabel(card);
      const owner = zoneOwner(card) ?? zoneOwner(previous);
      const sourceOwner = zoneOwner(previous) ?? owner;
      if (!from || !to || (owner !== 'host' && owner !== 'guest')) { known = false; break; }
      const key = `${sourceOwner}:${owner}:${from}:${to}`;
      const current = moves.get(key);
      moves.set(key, { owner, ...(sourceOwner !== owner ? { sourceOwner } : {}), from, to, count: (current?.count ?? 0) + 1 });
    }
    // Sort aggregate groups so private card-array/deck order never leaks.
    if (known && moves.size) summary = { kind: 'move', moves: [...moves.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value) };
  } else if (description && description.kind !== 'generic') summary = { kind: description.kind as 'orientation' | 'face' | 'shuffle' | 'token' | 'attack' };
  return { type: 'UNDO_COMPLETED', actor, summary };
};
