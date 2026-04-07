import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { CardInstance } from '../components/Card';
import { buildCardPlayedEffect, formatCardPlayedEffect } from './cardPlayUi';

const t = ((key: string, options?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    'gameBoard.modals.shared.actor.you': 'You',
    'gameBoard.modals.shared.actor.opponent': 'Opponent',
    'gameBoard.modals.shared.actor.player1': 'Player 1',
    'gameBoard.modals.shared.actor.player2': 'Player 2',
    'gameBoard.modals.shared.messages.cardPlayed': '{{actor}} played {{cardName}}',
    'gameBoard.modals.shared.messages.cardPlayedToField': '{{actor}} played to field {{cardName}}',
  };

  let value = map[key] || key;
  if (options) {
    Object.keys(options).forEach(k => {
      value = value.replace(`{{${k}}}`, String(options[k]));
    });
  }
  return value;
}) as TFunction;

const createCard = (overrides: Partial<CardInstance>): CardInstance => ({
  id: 'card-1',
  cardId: 'BP01-001',
  name: 'Test Card',
  image: '',
  zone: 'hand-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

describe('cardPlayUi', () => {
  it('builds a play effect for hand or ex cards', () => {
    const effect = buildCardPlayedEffect([
      createCard({ id: 'spell-1', name: 'Fire Chain', baseCardType: 'spell' }),
    ], 'host', 'spell-1');

    expect(effect).toEqual({
      type: 'CARD_PLAYED',
      actor: 'host',
      cardId: 'spell-1',
      cardName: 'Fire Chain',
      mode: 'play',
    });
  });

  it('builds a play-to-field effect for followers and amulets', () => {
    const effect = buildCardPlayedEffect([
      createCard({ id: 'follower-1', zone: 'ex-host', name: 'Quickblader', baseCardType: 'follower' }),
    ], 'host', 'follower-1');

    expect(effect?.mode).toBe('playToField');
  });

  it('ignores non-hand and non-ex cards', () => {
    const effect = buildCardPlayedEffect([
      createCard({ id: 'field-1', zone: 'field-host', baseCardType: 'follower' }),
    ], 'host', 'field-1');

    expect(effect).toBeNull();
  });

  it('formats shared play messages for p2p and solo', () => {
    const effect = {
      type: 'CARD_PLAYED' as const,
      actor: 'guest' as const,
      cardId: 'spell-1',
      cardName: 'Fire Chain',
      mode: 'play' as const,
    };

    expect(formatCardPlayedEffect(effect, 'host', false, t)).toBe('Opponent played Fire Chain');
    expect(formatCardPlayedEffect({ ...effect, mode: 'playToField' }, 'host', true, t)).toBe('Player 2 played to field Fire Chain');
  });
});
