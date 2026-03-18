import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import { buildAttackDeclaredEffect, canDeclareAttack, formatAttackEffect } from './attackUi';

const createCard = (overrides: Partial<CardInstance>): CardInstance => ({
  id: 'card-1',
  cardId: 'BP01-001',
  name: 'Test Follower',
  image: '',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

describe('attackUi', () => {
  it('allows a current-turn field follower to attack an opposing field follower', () => {
    const cards = [
      createCard({ id: 'attacker', owner: 'host', zone: 'field-host' }),
      createCard({ id: 'target', owner: 'guest', zone: 'field-guest', name: 'Enemy Follower' }),
    ];

    expect(canDeclareAttack(cards, 'host', 'attacker', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(true);
  });

  it('rejects attacks from tapped followers or outside the field', () => {
    const tappedAttacker = createCard({ id: 'tapped', isTapped: true });
    const target = createCard({ id: 'target', owner: 'guest', zone: 'field-guest' });

    expect(canDeclareAttack([tappedAttacker, target], 'host', 'tapped', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);

    const handAttacker = createCard({ id: 'hand-card', zone: 'hand-host' });
    expect(canDeclareAttack([handAttacker, target], 'host', 'hand-card', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
  });

  it('builds and formats attack effects for announcements and history', () => {
    const cards = [
      createCard({ id: 'attacker', name: 'Quickblader', owner: 'host', zone: 'field-host' }),
      createCard({ id: 'target', name: 'Aurelia', owner: 'guest', zone: 'field-guest' }),
    ];

    const effect = buildAttackDeclaredEffect(cards, 'host', 'attacker', { type: 'card', cardId: 'target' });
    expect(effect).not.toBeNull();
    if (!effect || effect.type !== 'ATTACK_DECLARED') {
      throw new Error('Expected attack effect');
    }

    const formatted = formatAttackEffect(effect, 'host', false);
    expect(formatted.announcement).toBe('You: Quickblader attacks Opponent Aurelia');
    expect(formatted.history).toBe('You: Quickblader -> Opponent Aurelia');
  });
});
