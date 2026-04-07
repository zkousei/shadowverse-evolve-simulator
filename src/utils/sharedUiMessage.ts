import type { TFunction } from 'i18next';
import type { PlayerRole } from '../types/game';
import type { SharedUiEffect } from '../types/sync';

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

  if (effect.type === 'RANDOM_HAND_DISCARD_COMPLETED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const targetLabel = getSharedActorLabel(effect.target, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.randomHandDiscard', {
      actor: actorLabel,
      target: targetLabel,
      count: effect.count,
    });
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

  if (effect.type === 'REVEAL_HAND_CARDS') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return t('gameBoard.modals.shared.messages.revealHand', { actor: actorLabel });
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
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    return effect.mode === 'play'
      ? t('gameBoard.modals.shared.messages.cardPlayed', { actor: actorLabel, cardName: effect.cardName })
      : t('gameBoard.modals.shared.messages.cardPlayedToField', { actor: actorLabel, cardName: effect.cardName });
  }

  const starterLabel = getSharedActorLabel(effect.starter, viewerRole, isSoloMode, t);
  const baseMessage = t('gameBoard.modals.shared.messages.starterDecided', { actor: starterLabel });
  return effect.manual ? t('gameBoard.modals.shared.messages.starterDecidedManual', { actor: starterLabel }) : baseMessage;
};
