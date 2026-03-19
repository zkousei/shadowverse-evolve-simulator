import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';
import { formatCardPlayedEffect } from './cardPlayUi';

export const flipSharedCoin = (
  random: () => number = Math.random
): 'HEADS (表)' | 'TAILS (裏)' => {
  return random() > 0.5 ? 'HEADS (表)' : 'TAILS (裏)';
};

export const rollSharedDie = (
  random: () => number = Math.random
): number => {
  return Math.floor(random() * 6) + 1;
};

export const getSharedActorLabel = (
  actor: PlayerRole,
  viewerRole: PlayerRole,
  isSoloMode: boolean
): string => {
  if (isSoloMode) {
    return actor === 'host' ? 'Player 1' : 'Player 2';
  }

  return actor === viewerRole ? 'You' : 'Opponent';
};

export const formatSharedUiMessage = (
  effect: SharedUiEffect,
  viewerRole: PlayerRole,
  isSoloMode: boolean
): string => {
  if (effect.type === 'COIN_FLIP_RESULT') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} flipped: ${effect.result}`;
  }

  if (effect.type === 'DICE_ROLL_RESULT') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} rolled: ${effect.value}`;
  }

  if (effect.type === 'RESET_GAME_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} reset the game`;
  }

  if (effect.type === 'SHUFFLE_DECK_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} shuffled the deck`;
  }

  if (effect.type === 'MILL_CARD_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} milled ${effect.cardName}`;
  }

  if (effect.type === 'REVEAL_TOP_DECK_CARDS') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} revealed from Look Top`;
  }

  if (effect.type === 'REVEAL_SEARCHED_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} revealed from Search`;
  }

  if (effect.type === 'ATTACK_DECLARED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} declared an attack`;
  }

  if (effect.type === 'CARD_PLAYED') {
    return formatCardPlayedEffect(effect, viewerRole, isSoloMode);
  }

  const starterLabel = getSharedActorLabel(effect.starter, viewerRole, isSoloMode);
  const baseMessage = `${starterLabel} will go first!`;
  return effect.manual ? `Manually set: ${baseMessage}` : baseMessage;
};
