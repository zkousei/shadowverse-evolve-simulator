import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';
import { getSharedActorLabel } from './sharedRandom';
import { isMainDeckSpellCard } from './cardType';

export const buildCardPlayedEffect = (
  cards: CardInstance[],
  actor: PlayerRole,
  cardId: string
): Extract<SharedUiEffect, { type: 'CARD_PLAYED' }> | null => {
  const card = cards.find(entry => entry.id === cardId);
  if (!card) return null;
  if (!(card.zone.startsWith('hand-') || card.zone.startsWith('ex-'))) return null;

  return {
    type: 'CARD_PLAYED',
    actor,
    cardId: card.id,
    cardName: card.name,
    mode: isMainDeckSpellCard(card) ? 'play' : 'playToField',
  };
};

export const formatCardPlayedEffect = (
  effect: Extract<SharedUiEffect, { type: 'CARD_PLAYED' }>,
  viewerRole: PlayerRole,
  isSoloMode: boolean
): string => {
  const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
  return effect.mode === 'play'
    ? `${actorLabel} played ${effect.cardName}`
    : `${actorLabel} played to field ${effect.cardName}`;
};

