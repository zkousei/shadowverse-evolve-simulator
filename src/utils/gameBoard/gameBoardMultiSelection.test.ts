import { describe, expect, it } from 'vitest';
import { extractCardToFieldAttachment } from '../card/cardLogic';
import type { CardInstance } from '../../components/Card';
import { resolveBoardUnit, getBoardUnits, canApplyBoardBatch, applyBoardBatch } from './gameBoardMultiSelection';

export const boardCard = (id: string, overrides: Partial<CardInstance> = {}): CardInstance => ({
  id, cardId: id, name: id, image: '', zone: 'field-host', owner: 'host',
  isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 }, baseCardType: 'follower', ...overrides,
});
const evolved = () => [boardCard('base', { counters: { atk: 2, hp: -1 } }), boardCard('evolve', { attachedTo: 'base', isEvolveCard: true }), boardCard('equipment', { linkedTo: 'base', baseCardType: 'amulet' })];

describe('board multi selection', () => {
  it('resolves any member to one unit and adjusts only the active evolved card', () => {
    const cards = evolved();
    const unit = resolveBoardUnit(cards, 'equipment', 'host')!;
    expect(unit.rootId).toBe('base');
    expect(unit.activeId).toBe('evolve');
    expect(getBoardUnits(cards, 'host')).toHaveLength(1);
    const next = applyBoardBatch(cards, [unit], 'atk+');
    expect(next.find(c => c.id === 'base')!.counters.atk).toBe(2);
    expect(next.find(c => c.id === 'evolve')!.counters.atk).toBe(1);
    expect(next.find(c => c.id === 'equipment')!.counters.atk).toBe(0);
  });
  it('rejects private zones, leaders, other sides, cycles and conflicting relationships', () => {
    for (const overrides of [{ zone: 'hand-host' }, { isLeaderCard: true }, { zone: 'field-guest' }]) {
      expect(resolveBoardUnit([boardCard('a', overrides)], 'a', 'host')).toBeNull();
    }
    expect(resolveBoardUnit([boardCard('a', { linkedTo: 'b' }), boardCard('b', { linkedTo: 'a' })], 'a', 'host')).toBeNull();
    expect(resolveBoardUnit([...evolved(), boardCard('evolve2', { attachedTo: 'base', linkedTo: 'base' })], 'base', 'host')).toBeNull();
  });
  it('disables numerical changes for face down cards or mixed card types', () => {
    const cards = [boardCard('a'), boardCard('b', { baseCardType: 'amulet' }), boardCard('hidden', { isFlipped: true })];
    const units = getBoardUnits(cards, 'host');
    expect(canApplyBoardBatch(cards, units, 'hp-')).toBe(false);
    expect(canApplyBoardBatch(cards, units, 'cemetery')).toBe(true);
    expect(canApplyBoardBatch(cards, [units[2]], 'counter+')).toBe(false);
  });
  it('sets a uniform orientation and handles zero counters without fake changes', () => {
    const cards = [...evolved(), boardCard('other', { isTapped: true })];
    const units = getBoardUnits(cards, 'host');
    const tapped = applyBoardBatch(cards, units, 'rest');
    expect(tapped.every(c => c.isTapped)).toBe(true);
    expect(applyBoardBatch(tapped, units, 'rest')).toBe(tapped);
    expect(applyBoardBatch(cards, units, 'counter-')).toBe(cards);
  });
  it('moves roots once, returns evolve cards and preserves source order', () => {
    const cards = [...evolved().slice(0, 2), boardCard('other')];
    const units = getBoardUnits(cards, 'host');
    const moved = applyBoardBatch(cards, [...units].reverse(), 'cemetery');
    expect(moved.filter(c => c.zone === 'cemetery-host').map(c => c.id)).toEqual(['base', 'other']);
    expect(moved.find(c => c.id === 'evolve')!.zone).toBe('evolveDeck-host');
  });
  it('rejects changed topology and deduplicates overlapping requests', () => {
    const cards = evolved();
    const unit = resolveBoardUnit(cards, 'base', 'host')!;
    expect(applyBoardBatch(cards, [unit, unit], 'atk+').find(c => c.id === 'evolve')!.counters.atk).toBe(1);
    const changed = cards.map(c => c.id === 'equipment' ? { ...c, linkedTo: undefined } : c);
    expect(canApplyBoardBatch(changed, [unit], 'atk+')).toBe(false);
    expect(applyBoardBatch(changed, [unit], 'cemetery')).toBe(changed);
  });
});


describe('multiple attachments on one root', () => {
  const stack = () => {
    let cards = [boardCard('base'), boardCard('middle', { zone: 'hand-host' }), boardCard('top', { zone: 'hand-host', isEvolveCard: true })];
    cards = extractCardToFieldAttachment(cards, 'middle', 'host', 'base');
    cards = extractCardToFieldAttachment(cards, 'top', 'host', 'middle');
    return [...cards, boardCard('link', { linkedTo: 'base', baseCardType: 'amulet' })];
  };
  it('selects any member once and adjusts only the last displayed attachment', () => {
    const cards = stack();
    const units = getBoardUnits(cards, 'host');
    expect(units).toHaveLength(1);
    for (const card of cards) expect(resolveBoardUnit(cards, card.id, 'host')).toMatchObject({ rootId: 'base', activeId: 'top' });
    for (const action of ['atk+', 'hp+', 'counter+'] as const) {
      const adjusted = applyBoardBatch(cards, units, action);
      expect(adjusted.find(card => card.id === 'top')).toMatchObject(action === 'counter+' ? { genericCounter: 1 } : { counters: { [action === 'atk+' ? 'atk' : 'hp']: 1 } });
      for (const id of ['base', 'middle', 'link']) expect(adjusted.find(card => card.id === id)).toEqual(cards.find(card => card.id === id));
    }
    expect(applyBoardBatch(cards, units, 'rest').every(card => card.isTapped)).toBe(true);
    const moved = applyBoardBatch(cards, units, 'cemetery');
    expect(moved.filter(card => card.zone === 'cemetery-host').map(card => card.id)).toEqual(['base', 'middle', 'link']);
    expect(moved.find(card => card.id === 'top')?.zone).toBe('evolveDeck-host');
  });
  it('invalidates selection when attachment order changes the displayed top card', () => {
    const cards = stack();
    const units = getBoardUnits(cards, 'host');
    const reordered = [cards[0], cards[2], cards[1], cards[3]];
    expect(resolveBoardUnit(reordered, 'base', 'host')?.activeId).toBe('middle');
    expect(canApplyBoardBatch(reordered, units, 'atk+')).toBe(false);
    expect(applyBoardBatch(reordered, units, 'cemetery')).toBe(reordered);
  });
});
