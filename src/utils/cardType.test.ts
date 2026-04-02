import { describe, expect, it } from 'vitest';
import { isAdvanceKind, isMainDeckSpellCard, isPureEvolveCard, normalizeBaseCardType } from './cardType';

describe('cardType', () => {
  it('normalizes known card kinds and Japanese fallback labels', () => {
    expect(normalizeBaseCardType('evolve_follower')).toBe('follower');
    expect(normalizeBaseCardType('スペル')).toBe('spell');
    expect(normalizeBaseCardType('アミュレット・土の秘術')).toBe('amulet');
  });

  it('returns null for empty or unsupported values', () => {
    expect(normalizeBaseCardType()).toBeNull();
    expect(normalizeBaseCardType(null)).toBeNull();
    expect(normalizeBaseCardType('leader')).toBeNull();
  });

  it('detects only non-evolve spell cards as main-deck spells', () => {
    expect(isMainDeckSpellCard(null)).toBe(false);
    expect(isMainDeckSpellCard(undefined)).toBe(false);
    expect(isMainDeckSpellCard({ baseCardType: 'spell' })).toBe(true);
    expect(isMainDeckSpellCard({ baseCardType: 'spell', isEvolveCard: true })).toBe(false);
    expect(isMainDeckSpellCard({ baseCardType: 'follower' })).toBe(false);
  });

  it('distinguishes advance cards from non-advance evolve cards', () => {
    expect(isAdvanceKind('advance_follower')).toBe(true);
    expect(isAdvanceKind('evolve_follower')).toBe(false);
    expect(isPureEvolveCard({ isEvolveCard: true, cardKindNormalized: 'evolve_follower' })).toBe(true);
    expect(isPureEvolveCard({ isEvolveCard: true, cardKindNormalized: 'advance_follower' })).toBe(false);
    expect(isPureEvolveCard({ isEvolveCard: true })).toBe(true);
  });
});
