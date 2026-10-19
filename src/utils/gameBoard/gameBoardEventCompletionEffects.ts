import { buildUndoLogEffect } from './gameBoardUndoLog';
import { buildTopDeckRevealEffect } from './topDeckReveal';
import { buildTopDeckSummaryEffect } from './topDeckSummary';
import { buildCardRevealEffect } from './cardReveal';
import { buildAttackDeclaredEffect } from './attackUi';
import { buildCardPlayedEffect } from './cardPlayUi';
import { resolveCardDisplayName, type CardDetailLookup } from '../card/cardDetails';
import type { CardInstance } from '../../components/Card';
import type { PlayerRole, SyncState } from '../../types/game';
import type { GameSyncEvent, SharedUiEffect } from '../../types/sync';

export interface EventCompletionEffects {
  snapshotEffects: SharedUiEffect[];
  broadcastEffects: SharedUiEffect[];
}

export interface BuildEventCompletionEffectsParams {
  event: GameSyncEvent;
  currentState: SyncState;
  nextState: SyncState;
  cardDetailLookup?: CardDetailLookup;
}

export function buildEventCompletionEffects({
  event,
  currentState,
  nextState,
  cardDetailLookup,
}: BuildEventCompletionEffectsParams): EventCompletionEffects {
  const snapshotEffects: SharedUiEffect[] = [];
  const broadcastEffects: SharedUiEffect[] = [];

  const queueSnapshotEffect = (effect: SharedUiEffect | null | undefined) => {
    if (!effect) return;
    snapshotEffects.push(effect);
  };

  const queueBroadcastEffect = (effect: SharedUiEffect | null | undefined) => {
    if (!effect) return;
    broadcastEffects.push(effect);
  };

  if (event.type === 'UNDO_CARD_MOVE') {
    queueSnapshotEffect(buildUndoLogEffect(currentState, nextState, event.actor));
  }
  if (event.type === 'UNDO_LAST_TURN') {
    queueSnapshotEffect({ type: 'UNDO_COMPLETED', actor: event.actor, summary: { kind: 'turn' } });
  }
  if (event.type === 'BOARD_BATCH') {
    queueSnapshotEffect({
      type: 'BOARD_BATCH_COMPLETED',
      actor: event.actor,
      action: event.action,
      count: new Set(event.targets.map(target => target.rootId)).size,
    });
  }

  const extractDestination =
    event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH'
      ? event.destination
      : undefined;
  const extractRevealToOpponent =
    event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH'
      ? Boolean(event.revealToOpponent)
      : false;
  const extractedCardIds =
    event.type === 'EXTRACT_CARD'
      ? [event.cardId]
      : event.type === 'EXTRACT_CARDS_BATCH'
        ? event.cardIds
        : [];
  const extractedCards = extractedCardIds
    .map((cardId) => currentState.cards.find((card) => card.id === cardId))
    .filter((card): card is CardInstance => Boolean(card));

  const cardsFromZonePrefix = (cards: CardInstance[], zonePrefix: string) => (
    cards.filter((card) => card.zone.startsWith(`${zonePrefix}-`))
  );

  const getZoneOwner = (zone?: string): PlayerRole | undefined => {
    if (zone?.endsWith('-host')) return 'host';
    if (zone?.endsWith('-guest')) return 'guest';
    return undefined;
  };

  const getUniformCardOwner = (cards: CardInstance[]): PlayerRole | undefined => {
    if (cards.length === 0) return undefined;
    const firstOwner = cards[0].owner;
    return cards.every((card) => card.owner === firstOwner) ? firstOwner : undefined;
  };

  const buildOwnerContext = (
    sourceOwner?: PlayerRole,
    destinationOwner?: PlayerRole
  ): { sourceOwner?: PlayerRole; destinationOwner?: PlayerRole } => {
    const shouldIncludeOwnerContext =
      (sourceOwner !== undefined && sourceOwner !== event.actor) ||
      (destinationOwner !== undefined && destinationOwner !== event.actor);

    return shouldIncludeOwnerContext
      ? { sourceOwner, destinationOwner }
      : {};
  };

  const countCardsInZone = (zonePrefix: string) => cardsFromZonePrefix(extractedCards, zonePrefix);
  const getPreviewCardNames = (cards: CardInstance[]) => cards.slice(0, 5).map((card) => card.name);

  const mainDeckExtractedCards = countCardsInZone('mainDeck');
  const cemeteryExtractedCards = countCardsInZone('cemetery');
  const banishExtractedCards = countCardsInZone('banish');
  const evolveExtractedCards = countCardsInZone('evolveDeck');
  const extractDestinationOwner = getZoneOwner(extractDestination);

  const bottomedCardIds =
    event.type === 'SEND_TO_BOTTOM'
      ? [event.cardId]
      : event.type === 'SEND_TO_BOTTOM_BATCH'
        ? event.cardIds
        : [];
  const bottomedCards = bottomedCardIds
    .map((cardId) => currentState.cards.find((card) => card.id === cardId))
    .filter((card): card is CardInstance => Boolean(card));
  const cemeteryBottomedCards = cardsFromZonePrefix(bottomedCards, 'cemetery');
  const banishBottomedCards = cardsFromZonePrefix(bottomedCards, 'banish');

  const cemeteriedCardIds =
    event.type === 'SEND_TO_CEMETERY'
      ? [event.cardId]
      : event.type === 'SEND_TO_CEMETERY_BATCH'
        ? event.cardIds
        : [];
  const cemeteriedCards = cemeteriedCardIds
    .map((cardId) => currentState.cards.find((card) => card.id === cardId))
    .filter((card): card is CardInstance => Boolean(card));
  const mainDeckToCemeteryCards = cardsFromZonePrefix(cemeteriedCards, 'mainDeck');

  const banishedCardIds =
    event.type === 'BANISH_CARD'
      ? [event.cardId]
      : event.type === 'BANISH_CARDS_BATCH'
        ? event.cardIds
        : [];
  const banishedCards = banishedCardIds
    .map((cardId) => currentState.cards.find((card) => card.id === cardId))
    .filter((card): card is CardInstance => Boolean(card));
  const cemeteryBanishedCards = cardsFromZonePrefix(banishedCards, 'cemetery');

  if (event.type === 'RESOLVE_TOP_DECK') {
    const revealEffect = buildTopDeckRevealEffect(currentState.cards, event.actor, event.results);
    queueSnapshotEffect(revealEffect);
    const summaryEffect = buildTopDeckSummaryEffect(currentState.cards, event.actor, event.results);
    queueSnapshotEffect(summaryEffect);
  }

  if (
    (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
    extractRevealToOpponent &&
    extractDestination?.startsWith('hand-')
  ) {
    const revealEffect = buildCardRevealEffect(
      currentState.cards,
      event.actor,
      extractedCardIds,
      'REVEAL_SEARCHED_CARD_TO_HAND'
    );
    queueSnapshotEffect(revealEffect);
  }

  if (
    (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
    !extractRevealToOpponent &&
    extractDestination?.startsWith('hand-')
  ) {
    if (mainDeckExtractedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'SEARCHED_CARD_TO_HAND',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(mainDeckExtractedCards), extractDestinationOwner),
        count: mainDeckExtractedCards.length > 1 ? mainDeckExtractedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }
  }

  if (
    (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
    extractDestination?.startsWith('hand-')
  ) {
    if (cemeteryExtractedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'CEMETERY_CARD_TO_HAND',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(cemeteryExtractedCards), extractDestinationOwner),
        cardName: cemeteryExtractedCards.length === 1 ? cemeteryExtractedCards[0].name : undefined,
        cardNames: cemeteryExtractedCards.length > 1 ? getPreviewCardNames(cemeteryExtractedCards) : undefined,
        count: cemeteryExtractedCards.length > 1 ? cemeteryExtractedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }

    if (banishExtractedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'BANISHED_CARD_TO_HAND',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(banishExtractedCards), extractDestinationOwner),
        cardName: banishExtractedCards.length === 1 ? banishExtractedCards[0].name : undefined,
        cardNames: banishExtractedCards.length > 1 ? getPreviewCardNames(banishExtractedCards) : undefined,
        count: banishExtractedCards.length > 1 ? banishExtractedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }
  }

  if (
    (event.type === 'EXTRACT_CARD' || event.type === 'EXTRACT_CARDS_BATCH') &&
    (extractDestination?.startsWith('field-') || extractDestination?.startsWith('ex-'))
  ) {
    if (mainDeckExtractedCards.length > 0) {
      const isFieldDestination = extractDestination.startsWith('field-');
      const isFaceDownPlacement = isFieldDestination && currentState.gameStatus === 'preparing';
      const effect: SharedUiEffect = {
        type: 'SEARCHED_CARD_PLACED',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(mainDeckExtractedCards), extractDestinationOwner),
        destination: isFieldDestination ? 'field' : 'ex',
        cardName: !isFaceDownPlacement && mainDeckExtractedCards.length === 1 ? mainDeckExtractedCards[0].name : undefined,
        count: mainDeckExtractedCards.length > 1 ? mainDeckExtractedCards.length : undefined,
        isFaceDown: isFaceDownPlacement,
      };
      queueSnapshotEffect(effect);
    }

    if (cemeteryExtractedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'CEMETERY_CARD_PLACED',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(cemeteryExtractedCards), extractDestinationOwner),
        destination: extractDestination.startsWith('field-') ? 'field' : 'ex',
        cardName: cemeteryExtractedCards.length === 1 ? cemeteryExtractedCards[0].name : undefined,
        count: cemeteryExtractedCards.length > 1 ? cemeteryExtractedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }

    if (evolveExtractedCards.length === 1 && extractDestination.startsWith('field-')) {
      const effect: SharedUiEffect = {
        type: 'EVOLVE_CARD_PLACED',
        actor: event.actor,
        cardName: resolveCardDisplayName(evolveExtractedCards[0], cardDetailLookup ?? {}),
      };
      queueSnapshotEffect(effect);
    }

    if (banishExtractedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'BANISHED_CARD_PLACED',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(banishExtractedCards), extractDestinationOwner),
        destination: extractDestination.startsWith('field-') ? 'field' : 'ex',
        cardName: banishExtractedCards.length === 1 ? banishExtractedCards[0].name : undefined,
        count: banishExtractedCards.length > 1 ? banishExtractedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }
  }

  if (event.type === 'SEND_TO_BOTTOM' || event.type === 'SEND_TO_BOTTOM_BATCH') {
    if (cemeteryBottomedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'CEMETERY_CARD_TO_BOTTOM',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(cemeteryBottomedCards), getUniformCardOwner(cemeteryBottomedCards)),
        cardName: cemeteryBottomedCards.length === 1 ? cemeteryBottomedCards[0].name : undefined,
        cardNames: cemeteryBottomedCards.length > 1 ? getPreviewCardNames(cemeteryBottomedCards) : undefined,
        count: cemeteryBottomedCards.length > 1 ? cemeteryBottomedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }

    if (banishBottomedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'BANISHED_CARD_TO_BOTTOM',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(banishBottomedCards), getUniformCardOwner(banishBottomedCards)),
        cardName: banishBottomedCards.length === 1 ? banishBottomedCards[0].name : undefined,
        cardNames: banishBottomedCards.length > 1 ? getPreviewCardNames(banishBottomedCards) : undefined,
        count: banishBottomedCards.length > 1 ? banishBottomedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }
  }

  if (event.type === 'SEND_TO_CEMETERY' || event.type === 'SEND_TO_CEMETERY_BATCH') {
    if (mainDeckToCemeteryCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'MAIN_DECK_CARD_TO_CEMETERY',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(mainDeckToCemeteryCards), getUniformCardOwner(mainDeckToCemeteryCards)),
        cardName: mainDeckToCemeteryCards.length === 1 ? mainDeckToCemeteryCards[0].name : undefined,
        cardNames: mainDeckToCemeteryCards.length > 1 ? getPreviewCardNames(mainDeckToCemeteryCards) : undefined,
        count: mainDeckToCemeteryCards.length > 1 ? mainDeckToCemeteryCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }
  }

  if (event.type === 'BANISH_CARD' || event.type === 'BANISH_CARDS_BATCH') {
    if (cemeteryBanishedCards.length > 0) {
      const effect: SharedUiEffect = {
        type: 'CEMETERY_CARD_TO_BANISH',
        actor: event.actor,
        ...buildOwnerContext(getUniformCardOwner(cemeteryBanishedCards), getUniformCardOwner(cemeteryBanishedCards)),
        cardName: cemeteryBanishedCards.length === 1 ? cemeteryBanishedCards[0].name : undefined,
        cardNames: cemeteryBanishedCards.length > 1 ? getPreviewCardNames(cemeteryBanishedCards) : undefined,
        count: cemeteryBanishedCards.length > 1 ? cemeteryBanishedCards.length : undefined,
      };
      queueSnapshotEffect(effect);
    }
  }

  // --- Immediate Broadcast Effects ---
  if (event.type === 'SET_INITIAL_TURN_ORDER') {
    queueBroadcastEffect({
      type: 'STARTER_DECIDED',
      actor: event.actor,
      starter: event.starter,
      manual: event.manual,
    });
  }
  if (event.type === 'PLAY_TO_FIELD') {
    const effect = buildCardPlayedEffect(currentState.cards, event.actor, event.cardId);
    queueBroadcastEffect(effect);
  }
  if (event.type === 'TOGGLE_FLIP') {
    const toggledCard = currentState.cards.find((card) => card.id === event.cardId);
    if (toggledCard?.zone === `evolveDeck-${event.actor}` && toggledCard.isEvolveCard) {
      queueBroadcastEffect({
        type: 'EVOLVE_USAGE_TOGGLED',
        actor: event.actor,
        cardName: resolveCardDisplayName(toggledCard, cardDetailLookup ?? {}),
        isUsed: toggledCard.isFlipped,
      });
    }
  }
  if (event.type === 'RESET_GAME') {
    queueBroadcastEffect({
      type: 'RESET_GAME_COMPLETED',
      actor: event.actor,
    });
  }
  if (event.type === 'SHUFFLE_DECK') {
    queueBroadcastEffect({
      type: 'SHUFFLE_DECK_COMPLETED',
      actor: event.actor,
    });
  }
  if (event.type === 'DRAW_CARD') {
    queueBroadcastEffect({
      type: 'DRAW_CARD_COMPLETED',
      actor: event.actor,
    });
  }
  if (event.type === 'MILL_CARD') {
    const milledCard = currentState.cards.find(card => card.zone === `mainDeck-${event.actor}`);
    if (milledCard) {
      queueBroadcastEffect({
        type: 'MILL_CARD_COMPLETED',
        actor: event.actor,
        cardName: milledCard.name,
      });
    }
  }
  if (event.type === 'MOVE_TOP_CARD_TO_EX') {
    const movedCard = currentState.cards.find(card => card.zone === `mainDeck-${event.actor}`);
    if (movedCard) {
      queueBroadcastEffect({
        type: 'TOP_CARD_TO_EX_COMPLETED',
        actor: event.actor,
        cardName: movedCard.name,
      });
    }
  }
  if (event.type === 'MOVE_TOP_CARD_TO_BANISH') {
    const movedCard = currentState.cards.find(card => card.zone === `mainDeck-${event.actor}`);
    if (movedCard) {
      queueBroadcastEffect({
        type: 'TOP_CARD_TO_BANISH_COMPLETED',
        actor: event.actor,
        cardName: movedCard.name,
      });
    }
  }
  if (event.type === 'DISCARD_RANDOM_HAND_CARDS') {
    const beforeCount = currentState.cards.filter(card => card.zone === `hand-${event.target}`).length;
    const afterCount = nextState.cards.filter(card => card.zone === `hand-${event.target}`).length;
    const discardedCount = Math.max(0, beforeCount - afterCount);
    if (discardedCount > 0) {
      queueBroadcastEffect({
        type: 'RANDOM_HAND_DISCARD_COMPLETED',
        actor: event.actor,
        target: event.target,
        count: discardedCount,
      });
    }
  }
  if (event.type === 'ATTACK_DECLARATION') {
    const effect = buildAttackDeclaredEffect(currentState.cards, event.actor, event.attackerCardId, event.target);
    queueBroadcastEffect(effect);
  }

  return {
    snapshotEffects,
    broadcastEffects,
  };
}
