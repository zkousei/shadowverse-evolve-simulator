import type { TFunction } from 'i18next';
import type { CardInstance } from '../components/Card';
import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';
import { getSharedActorLabel } from './sharedUiMessage';
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
  isSoloMode: boolean,
  t: TFunction
): string => {
  const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
  return effect.mode === 'play'
    ? t('gameBoard.modals.shared.messages.cardPlayed', { actor: actorLabel, cardName: effect.cardName })
    : t('gameBoard.modals.shared.messages.cardPlayedToField', { actor: actorLabel, cardName: effect.cardName });
};
