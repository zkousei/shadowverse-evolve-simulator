import { describe, expect, it } from 'vitest';
import { canEditSearchedEvolveDeck } from './gameBoardEvolveFaceSelection';

describe('gameBoardEvolveFaceSelection', () => {
  it('allows editing the searched evolve deck for self in p2p and both players in solo', () => {
    expect(canEditSearchedEvolveDeck({
      searchZoneId: 'evolveDeck-host',
      isSoloMode: false,
      isSpectator: false,
      searchTargetRole: 'host',
      role: 'host',
    })).toBe(true);

    expect(canEditSearchedEvolveDeck({
      searchZoneId: 'evolveDeck-guest',
      isSoloMode: false,
      isSpectator: false,
      searchTargetRole: 'guest',
      role: 'host',
    })).toBe(false);

    expect(canEditSearchedEvolveDeck({
      searchZoneId: 'evolveDeck-guest',
      isSoloMode: true,
      isSpectator: false,
      searchTargetRole: 'guest',
      role: 'host',
    })).toBe(true);

    expect(canEditSearchedEvolveDeck({
      searchZoneId: 'evolveDeck-host',
      isSoloMode: true,
      isSpectator: false,
      searchTargetRole: 'host',
      role: 'host',
    })).toBe(true);
  });

  it('rejects spectators and non-evolve searches', () => {
    expect(canEditSearchedEvolveDeck({
      searchZoneId: 'evolveDeck-host',
      isSoloMode: true,
      isSpectator: true,
      searchTargetRole: 'host',
      role: 'host',
    })).toBe(false);

    expect(canEditSearchedEvolveDeck({
      searchZoneId: 'mainDeck-host',
      isSoloMode: true,
      isSpectator: false,
      searchTargetRole: 'host',
      role: 'host',
    })).toBe(false);

    expect(canEditSearchedEvolveDeck({
      searchZoneId: null,
      isSoloMode: true,
      isSpectator: false,
      searchTargetRole: 'host',
      role: 'host',
    })).toBe(false);
  });
});
