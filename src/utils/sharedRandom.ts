import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';

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

  const starterLabel = getSharedActorLabel(effect.starter, viewerRole, isSoloMode);
  const baseMessage = `${starterLabel} will go first!`;
  return effect.manual ? `Manually set: ${baseMessage}` : baseMessage;
};
