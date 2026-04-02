import type { TFunction } from 'i18next';
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
  isSoloMode: boolean,
  t: TFunction
): string => {
  if (isSoloMode) {
    return actor === 'host' ? t('gameBoard.modals.shared.actor.player1') : t('gameBoard.modals.shared.actor.player2');
  }

  return actor === viewerRole ? t('gameBoard.modals.shared.actor.you') : t('gameBoard.modals.shared.actor.opponent');
};

export const formatSharedUiMessage = (
  effect: SharedUiEffect,
  viewerRole: PlayerRole,
  isSoloMode: boolean,
  t: TFunction
): string => {
  if (effect.type === 'LOOK_TOP_RESOLVED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const detailLines: string[] = [];

    if (effect.revealedHandCards.length > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.revealedToHand', { cards: effect.revealedHandCards.join(', ') }));
    }
    if (effect.bottomCount > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.bottom', { count: effect.bottomCount }));
    }
    if (effect.topCount > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.top', { count: effect.topCount }));
    }
    if (effect.handCount > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.hand', { count: effect.handCount }));
    }
    if (effect.fieldCards.length > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.field', { cards: effect.fieldCards.join(', ') }));
    }
    if (effect.exCards.length > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.ex', { cards: effect.exCards.join(', ') }));
    }
    if (effect.cemeteryCards.length > 0) {
      detailLines.push(t('gameBoard.modals.shared.messages.lookTopDetail.cemetery', { cards: effect.cemeteryCards.join(', ') }));
    }

    const mainMessage = t('gameBoard.modals.shared.messages.lookTopResolved', { actor: actorLabel, count: effect.totalCount });
    return `${mainMessage}${detailLines.length > 0 ? `\n${detailLines.join('\n')}` : ''}`;
  }

  if (effect.type === 'COIN_FLIP_RESULT') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.coinFlip', { actor: actorLabel, result: effect.result });
  }

  if (effect.type === 'DICE_ROLL_RESULT') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.diceRoll', { actor: actorLabel, value: effect.value });
  }

  if (effect.type === 'RESET_GAME_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.resetGame', { actor: actorLabel });
  }

  if (effect.type === 'SHUFFLE_DECK_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.shuffleDeck', { actor: actorLabel });
  }

  if (effect.type === 'DRAW_CARD_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.drawCard', { actor: actorLabel });
  }

  if (effect.type === 'MILL_CARD_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.millCard', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'TOP_CARD_TO_EX_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.topCardToEx', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'SEARCHED_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.searchToHand', { actor: actorLabel });
  }

  if (effect.type === 'SEARCHED_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    if (effect.destination === 'field') {
      return effect.cardName
        ? t('gameBoard.modals.shared.messages.searchPlayedField', { actor: actorLabel, cardName: effect.cardName })
        : t('gameBoard.modals.shared.messages.searchSetField', { actor: actorLabel });
    } else {
      return effect.cardName
        ? t('gameBoard.modals.shared.messages.searchToEx', { actor: actorLabel, cardName: effect.cardName })
        : t('gameBoard.modals.shared.messages.searchToExGeneric', { actor: actorLabel });
    }
  }

  if (effect.type === 'CEMETERY_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.cemeteryToHand', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'CEMETERY_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return effect.destination === 'field'
      ? t('gameBoard.modals.shared.messages.cemeteryPlayedField', { actor: actorLabel, cardName: effect.cardName })
      : t('gameBoard.modals.shared.messages.cemeteryToEx', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'EVOLVE_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.evolvePlayedField', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'EVOLVE_USAGE_TOGGLED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return effect.isUsed
      ? t('gameBoard.modals.shared.messages.evolveSetUsed', { actor: actorLabel, cardName: effect.cardName })
      : t('gameBoard.modals.shared.messages.evolveSetUnused', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'BANISHED_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.banishToHand', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'BANISHED_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return effect.destination === 'field'
      ? t('gameBoard.modals.shared.messages.banishPlayedField', { actor: actorLabel, cardName: effect.cardName })
      : t('gameBoard.modals.shared.messages.banishToEx', { actor: actorLabel, cardName: effect.cardName });
  }

  if (effect.type === 'REVEAL_TOP_DECK_CARDS') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.revealLookTop', { actor: actorLabel });
  }

  if (effect.type === 'REVEAL_SEARCHED_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.revealSearch', { actor: actorLabel });
  }

  if (effect.type === 'ATTACK_DECLARED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.attackDeclared', { actor: actorLabel });
  }

  if (effect.type === 'CARD_PLAYED') {
    return formatCardPlayedEffect(effect, viewerRole, isSoloMode, t);
  }

  const starterLabel = getSharedActorLabel(effect.starter, viewerRole, isSoloMode, t);
  const baseMessage = t('gameBoard.modals.shared.messages.starterDecided', { actor: starterLabel });
  return effect.manual ? t('gameBoard.modals.shared.messages.starterDecidedManual', { actor: starterLabel }) : baseMessage;
};
