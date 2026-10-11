import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDisplayDedupKey, type DeckBuilderCardData } from '../../models/deckBuilderCard';
import { createEmptyDeckState } from '../../models/deckState';
import { CLASS } from '../../models/class';
import { createDefaultDeckRuleConfig, type DeckRuleConfig } from '../../models/deckRule';
import { INTRINSIC_DECK_EXCEPTIONS } from '../../data/intrinsicDeckExceptions';
import { POLICY_RESTRICTIONS } from '../../data/policyRestrictions';
import { canAddCardToDeckState, getCardAdditionProgress, sanitizeImportedDeckState, validateDeckState } from './deckBuilderRules';

const catalog = JSON.parse(readFileSync(new URL('../../../public/cards_detailed.json', import.meta.url), 'utf8')) as DeckBuilderCardData[];
const intrinsicCases = [
  ['オニオン軍団', 'main', 50],
  ['ラピッドファイア', 'main', 6],
  ['にんじん', 'evolve', 10],
  ['ドライブポイント', 'evolve', 10],
  ['開催大成功！', 'evolve', 10],
  ['聖なる夜に重なるキセキ', 'evolve', 10],
  ['1日の終わりに', 'evolve', 10],
  ['開幕ッ！大農耕時代ッ！', 'evolve', 10],
  ['合宿ッ！農家体験ッ！', 'evolve', 10],
] as const;
const cutthroat = catalog.find(card => card.id === 'BP19-110')!;
const copies = (card: DeckBuilderCardData, count: number) => Array.from({ length: count }, () => card);

const makeState = (card: DeckBuilderCardData, count: number) => ({
  ...createEmptyDeckState(),
  [card.deck_section === 'main' ? 'mainDeck' : 'evolveDeck']: copies(card, count),
});

// Audit real metadata and alternate printings as well as numerical boundaries.
describe('intrinsic restriction catalog audit', () => {
  it('covers every copy-limit exception declared in the current catalog text', () => {
    const declared = new Set(catalog.filter(card => /デッキに\d+枚まで入れることができる/.test(card.ability_text ?? '')).map(getDisplayDedupKey));
    expect([...declared].sort()).toEqual(INTRINSIC_DECK_EXCEPTIONS.map(rule => rule.key).sort());
  });

  it.each(intrinsicCases)('%s respects its %s limit of %i across all printings and helpers', (name, section, limit) => {
    const variants = catalog.filter(card => card.name === name && card.deck_section === section);
    expect(variants.length).toBeGreaterThan(0);
    for (const card of variants) {
      const below = makeState(variants[0], limit - 1);
      expect(getCardAdditionProgress(card, section, below)).toEqual({ count: limit - 1, limit });
      expect(canAddCardToDeckState(card, section, below)).toBe(true);
      expect(canAddCardToDeckState(card, section, makeState(card, limit))).toBe(false);
      expect(validateDeckState(makeState(card, limit)).filter(issue => issue.code === 'too-many-copies')).toEqual([]);
      expect(validateDeckState(makeState(card, limit + 1))).toContainEqual(expect.objectContaining({ code: 'too-many-copies', expected: limit }));
      const sanitized = sanitizeImportedDeckState(makeState(card, limit + 1), catalog);
      expect(sanitized[section === 'main' ? 'mainDeck' : 'evolveDeck']).toHaveLength(limit);

      const withCutthroat = { ...makeState(card, 1), mainDeck: section === 'main' ? [cutthroat, card] : [cutthroat] };
      expect(getCardAdditionProgress(card, section, withCutthroat)).toEqual({ count: 1, limit: 1 });
      expect(canAddCardToDeckState(card, section, withCutthroat)).toBe(false);
      const imported = { ...makeState(card, 2), mainDeck: section === 'main' ? [card, cutthroat, card] : [cutthroat] };
      expect(sanitizeImportedDeckState(imported, catalog)[section === 'main' ? 'mainDeck' : 'evolveDeck'].filter(entry => entry.name === name)).toHaveLength(1);
      expect(validateDeckState(imported)).toContainEqual(expect.objectContaining({ code: 'too-many-copies', expected: 1 }));
      expect(getCardAdditionProgress(card, section, makeState(card, 1)).limit).toBe(limit);
    }
  });
});

describe('policy restriction catalog audit', () => {
  it.each(POLICY_RESTRICTIONS)('$format $status $key applies across all printings, even with Cutthroat', restriction => {
    const variants = catalog.filter(card => getDisplayDedupKey(card) === restriction.key);
    expect(variants.length).toBeGreaterThan(0);
    const limit = restriction.status === 'banned' ? 0 : 1;
    for (const card of variants) {
      const cardClass = !card.class || card.class === '-' || card.class === CLASS.NEUTRAL ? CLASS.ROYAL : card.class;
      const rule: DeckRuleConfig = { ...createDefaultDeckRuleConfig(), format: restriction.format,
        selectedClass: cardClass,
        selectedClasses: [cardClass, cardClass === CLASS.WITCH ? CLASS.BISHOP : CLASS.WITCH] };
      const state = { ...createEmptyDeckState(), mainDeck: [cutthroat] };
      expect(getCardAdditionProgress(card, 'main', state, rule)).toEqual({ count: 0, limit });
      expect(canAddCardToDeckState(card, 'main', state, rule)).toBe(limit > 0);
      const illegal = { ...state, mainDeck: [cutthroat, ...copies(card, limit + 1)] };
      expect(canAddCardToDeckState(card, 'main', illegal, rule)).toBe(false);
      expect(validateDeckState(illegal, rule)).toContainEqual(expect.objectContaining({ code: 'too-many-copies', expected: limit }));
      expect(sanitizeImportedDeckState(illegal, catalog, rule).mainDeck.filter(entry => entry.name === card.name)).toHaveLength(limit);
    }
  });
});
