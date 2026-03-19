import { describe, expect, it } from 'vitest';
import { isMainDeckSpellCard, normalizeBaseCardType } from './cardType';

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
});
