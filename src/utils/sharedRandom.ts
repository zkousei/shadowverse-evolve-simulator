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
  if (effect.type === 'LOOK_TOP_RESOLVED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    const detailLines: string[] = [];

    if (effect.revealedHandCards.length > 0) detailLines.push(`Revealed to Hand: ${effect.revealedHandCards.join(', ')}`);
    if (effect.bottomCount > 0) detailLines.push(`Bottom: ${effect.bottomCount}`);
    if (effect.topCount > 0) detailLines.push(`Top: ${effect.topCount}`);
    if (effect.handCount > 0) detailLines.push(`Hand: ${effect.handCount}`);
    if (effect.fieldCards.length > 0) detailLines.push(`Field: ${effect.fieldCards.join(', ')}`);
    if (effect.exCards.length > 0) detailLines.push(`EX: ${effect.exCards.join(', ')}`);
    if (effect.cemeteryCards.length > 0) detailLines.push(`Cemetery: ${effect.cemeteryCards.join(', ')}`);

    return `${actorLabel} resolved Look Top ${effect.totalCount}${detailLines.length > 0 ? `\n${detailLines.join('\n')}` : ''}`;
  }

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

  if (effect.type === 'DRAW_CARD_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} drew a card`;
  }

  if (effect.type === 'MILL_CARD_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} milled ${effect.cardName}`;
  }

  if (effect.type === 'SEARCHED_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} added a card from Search to hand`;
  }

  if (effect.type === 'SEARCHED_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return effect.destination === 'field'
      ? (effect.cardName
          ? `${actorLabel} played to field ${effect.cardName} from Search`
          : `${actorLabel} set a card from Search to field`)
      : (effect.cardName
          ? `${actorLabel} added ${effect.cardName} from Search to EX Area`
          : `${actorLabel} added a card from Search to EX Area`);
  }

  if (effect.type === 'CEMETERY_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} added ${effect.cardName} from Cemetery to hand`;
  }

  if (effect.type === 'CEMETERY_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return effect.destination === 'field'
      ? `${actorLabel} played to field ${effect.cardName} from Cemetery`
      : `${actorLabel} added ${effect.cardName} from Cemetery to EX Area`;
  }

  if (effect.type === 'EVOLVE_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} played to field ${effect.cardName} from Evolve Deck`;
  }

  if (effect.type === 'EVOLVE_USAGE_TOGGLED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return effect.isUsed
      ? `${actorLabel} set ${effect.cardName} to USED`
      : `${actorLabel} set ${effect.cardName} to UNUSED`;
  }

  if (effect.type === 'BANISHED_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return `${actorLabel} added ${effect.cardName} from Banish to hand`;
  }

  if (effect.type === 'BANISHED_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode);
    return effect.destination === 'field'
      ? `${actorLabel} played to field ${effect.cardName} from Banish`
      : `${actorLabel} added ${effect.cardName} from Banish to EX Area`;
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
