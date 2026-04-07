import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import {
  canInspectCard,
  canStartAttack,
  getAttackHighlightTone,
  getAttackTargetFromCard,
  isInspectableZone,
  shouldClearAttackSource,
  shouldClearInspectorSelection,
  shouldDisableQuickActionsForAttackTarget,
} from './gameBoardCombat';

const makeCard = (overrides: Partial<CardInstance> = {}): CardInstance => ({
  id: 'card-1',
  cardId: 'TEST-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  genericCounter: 0,
  baseCardType: 'follower',
  cardKindNormalized: 'follower',
  ...overrides,
});

describe('gameBoardCombat', () => {
  it('recognizes inspectable zones', () => {
    expect(isInspectableZone('hand-host')).toBe(true);
    expect(isInspectableZone('field-guest')).toBe(true);
    expect(isInspectableZone('leader-host')).toBe(true);
    expect(isInspectableZone('mainDeck-host')).toBe(false);
  });

  it('validates whether cards can stay inspectable', () => {
    expect(canInspectCard(makeCard({ zone: 'hand-host' }))).toBe(true);
    expect(canInspectCard(makeCard({ zone: 'mainDeck-host' }))).toBe(false);
    expect(canInspectCard(makeCard({ zone: 'field-host', isFlipped: true }))).toBe(false);

    expect(shouldClearInspectorSelection(makeCard({ zone: 'field-host' }))).toBe(false);
    expect(shouldClearInspectorSelection(makeCard({ zone: 'mainDeck-host' }))).toBe(true);
    expect(shouldClearInspectorSelection(null)).toBe(true);
  });

  it('resolves attack targets for enemy leaders and followers', () => {
    const attacker = makeCard({ owner: 'host' });

    expect(
      getAttackTargetFromCard(attacker, makeCard({ zone: 'leader-guest', owner: 'guest', isLeaderCard: true }), {})
    ).toEqual({ type: 'leader', player: 'guest' });

    expect(
      getAttackTargetFromCard(attacker, makeCard({ id: 'enemy-1', zone: 'field-guest', owner: 'guest' }), {
        'TEST-001': { atk: 2, hp: 2 },
      })
    ).toEqual({ type: 'card', cardId: 'enemy-1' });

    expect(
      getAttackTargetFromCard(attacker, makeCard({ id: 'token-1', zone: 'field-guest', owner: 'guest', isTokenCard: true }), {})
    ).toEqual({ type: 'card', cardId: 'token-1' });
  });

  it('uses field controller rather than original owner for attack controls', () => {
    const borrowedAttacker = makeCard({ owner: 'guest', zone: 'field-host' });

    expect(canStartAttack(borrowedAttacker, {}, 'playing', 'host')).toBe(true);
    expect(shouldClearAttackSource(borrowedAttacker, 'playing', 'host')).toBe(false);
    expect(
      getAttackTargetFromCard(borrowedAttacker, makeCard({ id: 'borrowed-target', owner: 'host', zone: 'field-guest' }), {
        'TEST-001': { atk: 2, hp: 2 },
      })
    ).toEqual({ type: 'card', cardId: 'borrowed-target' });
    expect(
      getAttackHighlightTone(borrowedAttacker, makeCard({ id: 'borrowed-highlight-target', owner: 'host', zone: 'field-guest' }), {
        'TEST-001': { atk: 2, hp: 2 },
      })
    ).toBe('attack-target');
  });

  it('rejects invalid attack targets', () => {
    const attacker = makeCard({ owner: 'host' });

    expect(getAttackTargetFromCard(null, makeCard(), {})).toBeNull();
    expect(
      getAttackTargetFromCard(attacker, makeCard({ zone: 'field-host', owner: 'host' }), {
        'TEST-001': { atk: 2, hp: 2 },
      })
    ).toBeNull();
    expect(
      getAttackTargetFromCard(attacker, makeCard({ zone: 'field-guest', owner: 'guest', isLeaderCard: true }), {})
    ).toBeNull();
  });

  it('disables quick actions for enemy field cards while attacking', () => {
    const attacker = makeCard({ owner: 'host' });

    expect(
      shouldDisableQuickActionsForAttackTarget(attacker, makeCard({ zone: 'field-guest', owner: 'guest' }))
    ).toBe(true);
    expect(
      shouldDisableQuickActionsForAttackTarget(attacker, makeCard({ zone: 'leader-guest', owner: 'guest', isLeaderCard: true }))
    ).toBe(false);
    expect(shouldDisableQuickActionsForAttackTarget(null, makeCard())).toBe(false);
  });

  it('returns attack highlight tones for source and valid targets', () => {
    const attacker = makeCard({ id: 'attacker', owner: 'host' });

    expect(getAttackHighlightTone(attacker, attacker, {})).toBe('attack-source');
    expect(
      getAttackHighlightTone(attacker, makeCard({ zone: 'leader-guest', owner: 'guest', isLeaderCard: true }), {})
    ).toBe('attack-target');
    expect(
      getAttackHighlightTone(attacker, makeCard({ zone: 'field-guest', owner: 'guest' }), {
        'TEST-001': { atk: 2, hp: 2 },
      })
    ).toBe('attack-target');
    expect(
      getAttackHighlightTone(attacker, makeCard({ zone: 'field-host', owner: 'host' }), {
        'TEST-001': { atk: 2, hp: 2 },
      })
    ).toBeUndefined();
  });

  it('validates whether a card can start an attack', () => {
    expect(
      canStartAttack(makeCard(), {}, 'playing', 'host')
    ).toBe(true);
    expect(
      canStartAttack(makeCard({ baseCardType: 'spell' }), {}, 'playing', 'host')
    ).toBe(false);
    expect(
      canStartAttack(makeCard({ baseCardType: 'spell' }), { 'TEST-001': { atk: 2, hp: 2 } }, 'playing', 'host')
    ).toBe(true);
    expect(
      canStartAttack(makeCard({ isTapped: true }), {}, 'playing', 'host')
    ).toBe(false);
    expect(
      canStartAttack(makeCard({ isLeaderCard: true }), {}, 'playing', 'host')
    ).toBe(false);
    expect(
      canStartAttack(makeCard({ zone: 'hand-host' }), {}, 'playing', 'host')
    ).toBe(false);
    expect(
      canStartAttack(makeCard(), {}, 'preparing', 'host')
    ).toBe(false);
    expect(
      canStartAttack(makeCard({ owner: 'guest', zone: 'field-guest' }), {}, 'playing', 'host')
    ).toBe(false);
  });

  it('determines when the current attack source should be cleared', () => {
    expect(shouldClearAttackSource(makeCard(), 'playing', 'host')).toBe(false);
    expect(shouldClearAttackSource(null, 'playing', 'host')).toBe(true);
    expect(shouldClearAttackSource(makeCard({ isTapped: true }), 'playing', 'host')).toBe(true);
    expect(shouldClearAttackSource(makeCard({ isFlipped: true }), 'playing', 'host')).toBe(true);
    expect(shouldClearAttackSource(makeCard({ zone: 'hand-host' }), 'playing', 'host')).toBe(true);
    expect(shouldClearAttackSource(makeCard(), 'preparing', 'host')).toBe(true);
    expect(shouldClearAttackSource(makeCard({ owner: 'guest', zone: 'field-guest' }), 'playing', 'host')).toBe(true);
  });
});
