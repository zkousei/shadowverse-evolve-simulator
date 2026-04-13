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

const getSharedOwnerLabel = (
  owner: PlayerRole,
  viewerRole: PlayerRole,
  isSoloMode: boolean,
  t: TFunction
): string => {
  if (isSoloMode) {
    return owner === 'host' ? t('gameBoard.modals.shared.owner.player1') : t('gameBoard.modals.shared.owner.player2');
  }

  return owner === viewerRole ? t('gameBoard.modals.shared.owner.you') : t('gameBoard.modals.shared.owner.opponent');
};

const getOwnerContext = (
  effect: { actor: PlayerRole; sourceOwner?: PlayerRole; destinationOwner?: PlayerRole },
  viewerRole: PlayerRole,
  isSoloMode: boolean,
  t: TFunction
): { shouldUseOwnerContext: boolean; sourceOwner: string; destinationOwner: string } => {
  const shouldUseOwnerContext = Boolean(
    (effect.sourceOwner && effect.sourceOwner !== effect.actor) ||
    (effect.destinationOwner && effect.destinationOwner !== effect.actor)
  );
  const sourceOwner = effect.sourceOwner ?? effect.actor;
  const destinationOwner = effect.destinationOwner ?? effect.sourceOwner ?? effect.actor;

  return {
    shouldUseOwnerContext,
    sourceOwner: getSharedOwnerLabel(sourceOwner, viewerRole, isSoloMode, t),
    destinationOwner: getSharedOwnerLabel(destinationOwner, viewerRole, isSoloMode, t),
  };
};

const formatNamedCardSummary = (
  cardNames: string[] | undefined,
  totalCount: number | undefined,
  t: TFunction
): string | null => {
  if (!cardNames || cardNames.length === 0) return null;
  const names = cardNames.join(', ');
  const remainingCount = Math.max(0, (totalCount ?? cardNames.length) - cardNames.length);

  if (remainingCount === 0) return names;

  return t('gameBoard.modals.shared.messages.namedCardListWithMore', {
    cards: names,
    count: remainingCount,
  });
};

const appendNamedCardSummary = (
  baseMessage: string,
  cardNames: string[] | undefined,
  totalCount: number | undefined,
  t: TFunction
): string => {
  const namedSummary = formatNamedCardSummary(cardNames, totalCount, t);
  return namedSummary ? `${baseMessage}: ${namedSummary}` : baseMessage;
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
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      return t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.searchToHandMultipleOwned'
        : 'gameBoard.modals.shared.messages.searchToHandMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.searchToHandOwned'
      : 'gameBoard.modals.shared.messages.searchToHand', {
      actor: actorLabel,
      sourceOwner: ownerContext.sourceOwner,
      destinationOwner: ownerContext.destinationOwner,
    });
  }

  if (effect.type === 'SEARCHED_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      if (effect.destination === 'field') {
        return effect.isFaceDown
          ? t(ownerContext.shouldUseOwnerContext
            ? 'gameBoard.modals.shared.messages.searchSetFieldMultipleOwned'
            : 'gameBoard.modals.shared.messages.searchSetFieldMultiple', {
            actor: actorLabel,
            count: effect.count,
            sourceOwner: ownerContext.sourceOwner,
            destinationOwner: ownerContext.destinationOwner,
          })
          : t(ownerContext.shouldUseOwnerContext
            ? 'gameBoard.modals.shared.messages.searchPlayedFieldMultipleOwned'
            : 'gameBoard.modals.shared.messages.searchPlayedFieldMultiple', {
            actor: actorLabel,
            count: effect.count,
            sourceOwner: ownerContext.sourceOwner,
            destinationOwner: ownerContext.destinationOwner,
          });
      }
      return t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.searchToExMultipleOwned'
        : 'gameBoard.modals.shared.messages.searchToExMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
    }
    if (effect.destination === 'field') {
      return effect.cardName
        ? t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.searchPlayedFieldOwned'
          : 'gameBoard.modals.shared.messages.searchPlayedField', {
          actor: actorLabel,
          cardName: effect.cardName,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        })
        : t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.searchSetFieldOwned'
          : 'gameBoard.modals.shared.messages.searchSetField', {
          actor: actorLabel,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        });
    } else {
      return effect.cardName
        ? t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.searchToExOwned'
          : 'gameBoard.modals.shared.messages.searchToEx', {
          actor: actorLabel,
          cardName: effect.cardName,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        })
        : t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.searchToExGenericOwned'
          : 'gameBoard.modals.shared.messages.searchToExGeneric', {
          actor: actorLabel,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        });
    }
  }

  if (effect.type === 'MAIN_DECK_CARD_TO_CEMETERY') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      const baseMessage = t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.mainDeckToCemeteryMultipleOwned'
        : 'gameBoard.modals.shared.messages.mainDeckToCemeteryMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
      return appendNamedCardSummary(baseMessage, effect.cardNames, effect.count, t);
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.mainDeckToCemeteryOwned'
      : 'gameBoard.modals.shared.messages.mainDeckToCemetery', {
      actor: actorLabel,
      cardName: effect.cardName,
      sourceOwner: ownerContext.sourceOwner,
      destinationOwner: ownerContext.destinationOwner,
    });
  }

  if (effect.type === 'CEMETERY_CARD_TO_HAND') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      const baseMessage = t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.cemeteryToHandMultipleOwned'
        : 'gameBoard.modals.shared.messages.cemeteryToHandMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
      return appendNamedCardSummary(baseMessage, effect.cardNames, effect.count, t);
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.cemeteryToHandOwned'
      : 'gameBoard.modals.shared.messages.cemeteryToHand', {
      actor: actorLabel,
      cardName: effect.cardName,
      sourceOwner: ownerContext.sourceOwner,
      destinationOwner: ownerContext.destinationOwner,
    });
  }

  if (effect.type === 'CEMETERY_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      return effect.destination === 'field'
        ? t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.cemeteryPlayedFieldMultipleOwned'
          : 'gameBoard.modals.shared.messages.cemeteryPlayedFieldMultiple', {
          actor: actorLabel,
          count: effect.count,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        })
        : t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.cemeteryToExMultipleOwned'
          : 'gameBoard.modals.shared.messages.cemeteryToExMultiple', {
          actor: actorLabel,
          count: effect.count,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        });
    }
    return effect.destination === 'field'
      ? t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.cemeteryPlayedFieldOwned'
        : 'gameBoard.modals.shared.messages.cemeteryPlayedField', {
        actor: actorLabel,
        cardName: effect.cardName,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      })
      : t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.cemeteryToExOwned'
        : 'gameBoard.modals.shared.messages.cemeteryToEx', {
        actor: actorLabel,
        cardName: effect.cardName,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
  }

  if (effect.type === 'CEMETERY_CARD_TO_BANISH') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      const baseMessage = t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.cemeteryToBanishMultipleOwned'
        : 'gameBoard.modals.shared.messages.cemeteryToBanishMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
      });
      return appendNamedCardSummary(baseMessage, effect.cardNames, effect.count, t);
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.cemeteryToBanishOwned'
      : 'gameBoard.modals.shared.messages.cemeteryToBanish', {
      actor: actorLabel,
      cardName: effect.cardName,
      sourceOwner: ownerContext.sourceOwner,
    });
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
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      const baseMessage = t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.banishToHandMultipleOwned'
        : 'gameBoard.modals.shared.messages.banishToHandMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
      return appendNamedCardSummary(baseMessage, effect.cardNames, effect.count, t);
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.banishToHandOwned'
      : 'gameBoard.modals.shared.messages.banishToHand', {
      actor: actorLabel,
      cardName: effect.cardName,
      sourceOwner: ownerContext.sourceOwner,
      destinationOwner: ownerContext.destinationOwner,
    });
  }

  if (effect.type === 'CEMETERY_CARD_TO_BOTTOM') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      const baseMessage = t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.cemeteryToBottomMultipleOwned'
        : 'gameBoard.modals.shared.messages.cemeteryToBottomMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
      return appendNamedCardSummary(baseMessage, effect.cardNames, effect.count, t);
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.cemeteryToBottomOwned'
      : 'gameBoard.modals.shared.messages.cemeteryToBottom', {
      actor: actorLabel,
      cardName: effect.cardName,
      sourceOwner: ownerContext.sourceOwner,
      destinationOwner: ownerContext.destinationOwner,
    });
  }

  if (effect.type === 'BANISHED_CARD_TO_BOTTOM') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      const baseMessage = t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.banishToBottomMultipleOwned'
        : 'gameBoard.modals.shared.messages.banishToBottomMultiple', {
        actor: actorLabel,
        count: effect.count,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
      return appendNamedCardSummary(baseMessage, effect.cardNames, effect.count, t);
    }
    return t(ownerContext.shouldUseOwnerContext
      ? 'gameBoard.modals.shared.messages.banishToBottomOwned'
      : 'gameBoard.modals.shared.messages.banishToBottom', {
      actor: actorLabel,
      cardName: effect.cardName,
      sourceOwner: ownerContext.sourceOwner,
      destinationOwner: ownerContext.destinationOwner,
    });
  }

  if (effect.type === 'BANISHED_CARD_PLACED') {
    const actorLabel = getSharedActorLabel(effect.actor, viewerRole, isSoloMode, t);
    const ownerContext = getOwnerContext(effect, viewerRole, isSoloMode, t);
    if ((effect.count ?? 1) > 1) {
      return effect.destination === 'field'
        ? t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.banishPlayedFieldMultipleOwned'
          : 'gameBoard.modals.shared.messages.banishPlayedFieldMultiple', {
          actor: actorLabel,
          count: effect.count,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        })
        : t(ownerContext.shouldUseOwnerContext
          ? 'gameBoard.modals.shared.messages.banishToExMultipleOwned'
          : 'gameBoard.modals.shared.messages.banishToExMultiple', {
          actor: actorLabel,
          count: effect.count,
          sourceOwner: ownerContext.sourceOwner,
          destinationOwner: ownerContext.destinationOwner,
        });
    }
    return effect.destination === 'field'
      ? t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.banishPlayedFieldOwned'
        : 'gameBoard.modals.shared.messages.banishPlayedField', {
        actor: actorLabel,
        cardName: effect.cardName,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      })
      : t(ownerContext.shouldUseOwnerContext
        ? 'gameBoard.modals.shared.messages.banishToExOwned'
        : 'gameBoard.modals.shared.messages.banishToEx', {
        actor: actorLabel,
        cardName: effect.cardName,
        sourceOwner: ownerContext.sourceOwner,
        destinationOwner: ownerContext.destinationOwner,
      });
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
