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

const t = (key: string, options?: any) => {
  if (key === 'gameBoard.modals.shared.messages.attackAnnouncement') {
    return `${options.attacker} attacks ${options.target}`;
  }
  if (key === 'gameBoard.modals.shared.messages.attackHistory') {
    return `${options.attacker} -> ${options.target}`;
  }
  if (key === 'gameBoard.modals.shared.messages.leaderLabel') {
    return `${options.owner} Leader`;
  }
  if (key === 'gameBoard.modals.shared.actor.you') {
    return 'You';
  }
  if (key === 'gameBoard.modals.shared.actor.opponent') {
    return 'Opponent';
  }
  if (key === 'gameBoard.modals.shared.actor.player1') {
    return 'Player 1';
  }
  if (key === 'gameBoard.modals.shared.actor.player2') {
    return 'Player 2';
  }
  return key;
};

describe('attackUi', () => {
  it('allows a current-turn field follower to attack an opposing field follower', () => {
    const cards = [
      createCard({ id: 'attacker', owner: 'host', zone: 'field-host' }),
      createCard({ id: 'target', owner: 'guest', zone: 'field-guest', name: 'Enemy Follower' }),
    ];

    expect(canDeclareAttack(cards, 'host', 'attacker', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(true);
  });

  it('rejects attacks while preparing, off-turn, or when the attacker is invalid', () => {
    const cards = [
      createCard({ id: 'attacker', owner: 'host', zone: 'field-host' }),
      createCard({ id: 'target', owner: 'guest', zone: 'field-guest' }),
    ];

    expect(canDeclareAttack(cards, 'host', 'attacker', { type: 'card', cardId: 'target' }, 'host', 'preparing')).toBe(false);
    expect(canDeclareAttack(cards, 'host', 'attacker', { type: 'card', cardId: 'target' }, 'guest', 'playing')).toBe(false);
    expect(canDeclareAttack(cards, 'host', 'missing', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([
      createCard({ id: 'enemy-attacker', owner: 'guest', zone: 'field-guest' }),
      cards[1],
    ], 'host', 'enemy-attacker', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([
      createCard({ id: 'leader-attacker', isLeaderCard: true }),
      cards[1],
    ], 'host', 'leader-attacker', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([
      createCard({ id: 'hidden-attacker', isFlipped: true }),
      cards[1],
    ], 'host', 'hidden-attacker', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
  });

  it('rejects attacks from tapped followers or outside the field', () => {
    const tappedAttacker = createCard({ id: 'tapped', isTapped: true });
    const target = createCard({ id: 'target', owner: 'guest', zone: 'field-guest' });

    expect(canDeclareAttack([tappedAttacker, target], 'host', 'tapped', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);

    const handAttacker = createCard({ id: 'hand-card', zone: 'hand-host' });
    expect(canDeclareAttack([handAttacker, target], 'host', 'hand-card', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
  });

  it('handles leader attacks and rejects invalid card targets', () => {
    const attacker = createCard({ id: 'attacker', owner: 'host', zone: 'field-host' });
    const target = createCard({ id: 'target', owner: 'guest', zone: 'ex-guest' });

    expect(canDeclareAttack([attacker], 'host', 'attacker', { type: 'leader', player: 'guest' }, 'host', 'playing')).toBe(true);
    expect(canDeclareAttack([attacker], 'host', 'attacker', { type: 'leader', player: 'host' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([attacker], 'host', 'attacker', { type: 'card', cardId: 'missing' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([attacker, createCard({ id: 'ally-target', owner: 'host', zone: 'field-host' })], 'host', 'attacker', { type: 'card', cardId: 'ally-target' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([attacker, createCard({ id: 'leader-target', owner: 'guest', zone: 'field-guest', isLeaderCard: true })], 'host', 'attacker', { type: 'card', cardId: 'leader-target' }, 'host', 'playing')).toBe(false);
    expect(canDeclareAttack([attacker, target], 'host', 'attacker', { type: 'card', cardId: 'target' }, 'host', 'playing')).toBe(false);
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

    const formatted = formatAttackEffect(effect, 'host', false, t);
    expect(formatted.announcement).toBe('You Quickblader attacks Opponent Aurelia');
    expect(formatted.history).toBe('Quickblader -> Opponent Aurelia');
  });

  it('returns null when building an attack effect without a valid attacker or target', () => {
    const attacker = createCard({ id: 'attacker', owner: 'host', zone: 'field-host' });

    expect(buildAttackDeclaredEffect([attacker], 'host', 'missing', { type: 'leader', player: 'guest' })).toBeNull();
    expect(buildAttackDeclaredEffect([attacker], 'host', 'attacker', { type: 'card', cardId: 'missing' })).toBeNull();
  });

  it('formats leader attacks for solo mode labels', () => {
    const formatted = formatAttackEffect({
      type: 'ATTACK_DECLARED',
      actor: 'guest',
      attackerCardId: 'attacker',
      attackerName: 'Storm Rider',
      target: { type: 'leader', player: 'host' },
    }, 'guest', true, t);

    expect(formatted.announcement).toBe('Player 2 Storm Rider attacks Player 1 Leader');
    expect(formatted.history).toBe('Storm Rider -> Player 1 Leader');
  });
});
