import type { CardInstance } from '../../components/Card';
import type { PlayerRole } from '../../types/game';
import { normalizeBaseCardType } from '../card/cardType';
import { modifyCardCounter, modifyGenericCounter, sendCardToCemetery, banishCard } from '../card/cardLogic';

export const boardBatchActions = ['atk+', 'atk-', 'hp+', 'hp-', 'counter+', 'counter-', 'rest', 'stand', 'cemetery', 'banish'] as const;
export type BoardBatchAction = typeof boardBatchActions[number];
export type BoardUnitTarget = { rootId: string; signature: string };
export type BoardUnit = BoardUnitTarget & { activeId: string; memberIds: string[]; side: PlayerRole };

// A selection refers to a structural unit, not to mutable counters/tap state.
// Including zone/face/link information prevents stale requests targeting a changed unit.
export function resolveBoardUnit(cards: CardInstance[], cardId: string, side: PlayerRole): BoardUnit | null {
  const byId = new Map(cards.map(card => [card.id, card]));
  let root = byId.get(cardId);
  const visited = new Set<string>();
  while (root && (root.attachedTo || root.linkedTo)) {
    if (visited.has(root.id) || (root.attachedTo && root.linkedTo)) return null;
    visited.add(root.id);
    root = byId.get(root.attachedTo ?? root.linkedTo!);
  }
  if (!root || ![`field-${side}`, `ex-${side}`].includes(root.zone) || root.isLeaderCard) return null;
  const members: CardInstance[] = [];
  const queue = [root];
  const ids = new Set<string>();
  while (queue.length) {
    const card = queue.shift()!;
    if (ids.has(card.id) || card.zone !== root.zone || card.isLeaderCard || (card.attachedTo && card.linkedTo)) return null;
    ids.add(card.id);
    members.push(card);
    queue.push(...cards.filter(child => child.attachedTo === card.id || child.linkedTo === card.id));
  }
  let active = root;
  while (true) {
    const children = members.filter(card => card.attachedTo === active.id);
    if (!children.length) break;
    // Zone renders attachments in card-array order; the last sibling is on top.
    active = children.at(-1)!;
  }
  const signature = JSON.stringify([active.id, members.map(card => [card.id, card.zone, card.owner, card.attachedTo, card.linkedTo,
    card.isFlipped, card.selectedFaceSide, card.isEvolveCard, card.isTokenCard, card.baseCardType, card.cardKindNormalized]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
  return { rootId: root.id, activeId: active.id, memberIds: [...ids], side, signature };
}

export const getBoardUnits = (cards: CardInstance[], side: PlayerRole): BoardUnit[] => cards.flatMap(card => {
  if (card.attachedTo || card.linkedTo) return [];
  const unit = resolveBoardUnit(cards, card.id, side);
  return unit ? [unit] : [];
});

const resolveTargets = (cards: CardInstance[], targets: BoardUnitTarget[]): BoardUnit[] | null => {
  if (!targets.length || targets.length > cards.length) return null;
  const units = new Map<string, BoardUnit>();
  for (const target of targets) {
    const card = cards.find(card => card.id === target.rootId);
    const side = card?.zone.split('-')[1];
    if (side !== 'host' && side !== 'guest') return null;
    const unit = resolveBoardUnit(cards, target.rootId, side);
    if (!unit || unit.rootId !== target.rootId || unit.signature !== target.signature) return null;
    units.set(unit.rootId, unit);
  }
  return cards.flatMap(card => units.has(card.id) ? [units.get(card.id)!] : []);
};

export function canApplyBoardBatch(cards: CardInstance[], targets: BoardUnitTarget[], action: BoardBatchAction): boolean {
  if (!boardBatchActions.includes(action)) return false;
  const units = resolveTargets(cards, targets);
  if (!units) return false;
  return units.every(unit => {
    const active = cards.find(card => card.id === unit.activeId)!;
    if (action.startsWith('atk') || action.startsWith('hp')) {
      return !active.isFlipped && (active.baseCardType ?? normalizeBaseCardType(active.cardKindNormalized)) === 'follower';
    }
    if (action.startsWith('counter')) return !active.isFlipped;
    return true;
  });
}

export function applyBoardBatch(cards: CardInstance[], targets: BoardUnitTarget[], action: BoardBatchAction): CardInstance[] {
  if (!canApplyBoardBatch(cards, targets, action)) return cards;
  const units = resolveTargets(cards, targets)!;
  if (action === 'rest' || action === 'stand') {
    const ids = new Set(units.flatMap(unit => unit.memberIds));
    const isTapped = action === 'rest';
    if (!cards.some(card => ids.has(card.id) && card.isTapped !== isTapped)) return cards;
    return cards.map(card => ids.has(card.id) ? { ...card, isTapped } : card);
  }
  // Front insertion must run in reverse source order, independent of click order.
  const ordered = action === 'cemetery' || action === 'banish' ? [...units].reverse() : units;
  return ordered.reduce((current, unit) => {
    if (action === 'cemetery') return sendCardToCemetery(current, unit.rootId);
    if (action === 'banish') return banishCard(current, unit.rootId);
    const delta = action.endsWith('+') ? 1 : -1;
    if (action.startsWith('counter')) return modifyGenericCounter(current, unit.activeId, delta);
    return modifyCardCounter(current, unit.activeId, action.startsWith('atk') ? 'atk' : 'hp', delta);
  }, cards);
}
