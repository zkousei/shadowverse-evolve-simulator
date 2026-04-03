import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import {
  getAttackHighlightTone,
  getAttackTargetFromCard,
  isInspectableZone,
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
});
