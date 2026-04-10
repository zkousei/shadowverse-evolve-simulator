import React from 'react';
import type { TFunction } from 'i18next';
import type { PlayerRole } from '../types/game';
import type { SharedUiEffect, SyncMessage, PublicCardView } from '../types/sync';
import { formatSharedUiMessage, getSharedActorLabel } from '../utils/sharedUiMessage';
import { formatAttackEffect } from '../utils/attackUi';
import { formatCardPlayedEffect } from '../utils/cardPlayUi';
import { getIncomingSharedUiEffects } from '../utils/gameBoardIncomingSharedUiEffects';
import {
  mergeLookTopSummaryIntoOverlay,
  prependAttackHistoryEntry,
  prependEventHistoryEntry,
  type GameBoardRevealedCardsOverlay,
} from '../utils/gameBoardTransientUi';

type UseGameBoardSharedUiEffectsArgs = {
  gameStateRef: React.RefObject<{
    cards: Array<{ id: string; cardId: string; name: string }>;
    gameStatus: string;
  }>;
  isSoloMode: boolean;
  isSpectator: boolean;
  role: PlayerRole;
  tRef: React.RefObject<TFunction>;
};

type SnapshotMessage = Extract<SyncMessage, { type: 'STATE_SNAPSHOT' }>;

export const useGameBoardSharedUiEffects = ({
  gameStateRef,
  isSoloMode,
  isSpectator,
  role,
  tRef,
}: UseGameBoardSharedUiEffectsArgs) => {
  const [coinMessage, setCoinMessage] = React.useState<string | null>(null);
  const [turnMessage, setTurnMessage] = React.useState<string | null>(null);
  const [cardPlayMessage, setCardPlayMessage] = React.useState<string | null>(null);
  const [attackMessage, setAttackMessage] = React.useState<string | null>(null);
  const [attackHistory, setAttackHistory] = React.useState<string[]>([]);
  const [eventHistory, setEventHistory] = React.useState<string[]>([]);
  const [attackVisual, setAttackVisual] = React.useState<Extract<SharedUiEffect, { type: 'ATTACK_DECLARED' }> | null>(null);
  const [revealedCardsOverlay, setRevealedCardsOverlay] = React.useState<GameBoardRevealedCardsOverlay | null>(null);
  const [isRollingDice, setIsRollingDice] = React.useState(false);
  const [diceValue, setDiceValue] = React.useState<number | null>(null);

  const coinMessageTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceRollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const diceFinalizeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceMessageTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealedCardsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const attackMessageTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardPlayMessageTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnMessageTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLookTopSummaryLinesRef = React.useRef<string[] | null>(null);
  const revealTopIsActiveRef = React.useRef(false);

  const clearCoinMessageTimer = React.useCallback(() => {
    if (coinMessageTimeoutRef.current) {
      clearTimeout(coinMessageTimeoutRef.current);
      coinMessageTimeoutRef.current = null;
    }
  }, []);

  const showTimedCoinMessage = React.useCallback((message: string, durationMs: number) => {
    clearCoinMessageTimer();
    setCoinMessage(message);
    coinMessageTimeoutRef.current = setTimeout(() => {
      setCoinMessage(null);
      coinMessageTimeoutRef.current = null;
    }, durationMs);
  }, [clearCoinMessageTimer]);

  const clearDiceTimers = React.useCallback(() => {
    if (diceRollIntervalRef.current) {
      clearInterval(diceRollIntervalRef.current);
      diceRollIntervalRef.current = null;
    }
    if (diceFinalizeTimeoutRef.current) {
      clearTimeout(diceFinalizeTimeoutRef.current);
      diceFinalizeTimeoutRef.current = null;
    }
    if (diceMessageTimeoutRef.current) {
      clearTimeout(diceMessageTimeoutRef.current);
      diceMessageTimeoutRef.current = null;
    }
  }, []);

  const clearRevealedCardsTimer = React.useCallback(() => {
    if (revealedCardsTimeoutRef.current) {
      clearTimeout(revealedCardsTimeoutRef.current);
      revealedCardsTimeoutRef.current = null;
    }
    pendingLookTopSummaryLinesRef.current = null;
  }, []);

  const clearAttackMessageTimer = React.useCallback(() => {
    if (attackMessageTimeoutRef.current) {
      clearTimeout(attackMessageTimeoutRef.current);
      attackMessageTimeoutRef.current = null;
    }
  }, []);

  const clearAttackUiState = React.useCallback(() => {
    clearAttackMessageTimer();
    setAttackMessage(null);
    setAttackVisual(null);
    setAttackHistory([]);
    setEventHistory([]);
  }, [clearAttackMessageTimer]);

  const clearCardPlayMessageTimer = React.useCallback(() => {
    if (cardPlayMessageTimeoutRef.current) {
      clearTimeout(cardPlayMessageTimeoutRef.current);
      cardPlayMessageTimeoutRef.current = null;
    }
  }, []);

  const clearTurnMessageTimer = React.useCallback(() => {
    if (turnMessageTimeoutRef.current) {
      clearTimeout(turnMessageTimeoutRef.current);
      turnMessageTimeoutRef.current = null;
    }
  }, []);

  const clearTurnMessage = React.useCallback(() => {
    clearTurnMessageTimer();
    setTurnMessage(null);
  }, [clearTurnMessageTimer]);

  const showTimedCardPlayMessage = React.useCallback((message: string, durationMs: number) => {
    clearCardPlayMessageTimer();
    setCardPlayMessage(message);
    cardPlayMessageTimeoutRef.current = setTimeout(() => {
      setCardPlayMessage(null);
      cardPlayMessageTimeoutRef.current = null;
    }, durationMs);
  }, [clearCardPlayMessageTimer]);

  const showTimedTurnMessage = React.useCallback((message: string, durationMs: number) => {
    clearTurnMessageTimer();
    setTurnMessage(message);
    turnMessageTimeoutRef.current = setTimeout(() => {
      setTurnMessage(null);
      turnMessageTimeoutRef.current = null;
    }, durationMs);
  }, [clearTurnMessageTimer]);

  const pushEventHistory = React.useCallback((entry: string) => {
    setEventHistory((previous) => prependEventHistoryEntry(previous, entry));
  }, []);

  React.useEffect(() => {
    if (
      !revealedCardsOverlay ||
      revealedCardsOverlay.type !== 'look-top' ||
      !pendingLookTopSummaryLinesRef.current
    ) {
      return;
    }

    const summaryLines = pendingLookTopSummaryLinesRef.current;
    pendingLookTopSummaryLinesRef.current = null;
    setRevealedCardsOverlay((previous) => {
      return mergeLookTopSummaryIntoOverlay(previous, summaryLines);
    });
  }, [revealedCardsOverlay]);

  const playSharedUiEffect = React.useCallback((effect: SharedUiEffect) => {
    const translate = tRef.current;
    const usesPlayerLabels = isSoloMode || isSpectator;

    if (effect.type === 'COIN_FLIP_RESULT') {
      showTimedCoinMessage(formatSharedUiMessage(effect, role, usesPlayerLabels, translate), 3000);
      return;
    }

    if (effect.type === 'STARTER_DECIDED') {
      showTimedCoinMessage(formatSharedUiMessage(effect, role, usesPlayerLabels, translate), 4000);
      return;
    }

    if (effect.type === 'REVEAL_TOP_DECK_CARDS') {
      clearRevealedCardsTimer();
      const pendingSummary = pendingLookTopSummaryLinesRef.current ?? [];
      pendingLookTopSummaryLinesRef.current = null;
      revealTopIsActiveRef.current = true;
      const actorLabel = getSharedActorLabel(effect.actor, role, usesPlayerLabels, translate);
      setRevealedCardsOverlay({
        type: 'look-top',
        title: translate('gameBoard.modals.shared.messages.revealLookTop', { actor: actorLabel }),
        cards: effect.cards,
        summaryLines: pendingSummary,
      });
      revealedCardsTimeoutRef.current = setTimeout(() => {
        revealTopIsActiveRef.current = false;
        setRevealedCardsOverlay(null);
        revealedCardsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    if (effect.type === 'REVEAL_HAND_CARDS') {
      clearRevealedCardsTimer();
      const actorLabel = getSharedActorLabel(effect.actor, role, usesPlayerLabels, translate);
      const message = translate('gameBoard.modals.shared.messages.revealHand', { actor: actorLabel });
      const cardNames = effect.cards.map((card) => card.name).join(', ');

      pushEventHistory(cardNames ? `${message}: ${cardNames}` : message);
      setRevealedCardsOverlay({
        type: 'hand',
        title: message,
        cards: effect.cards,
      });
      revealedCardsTimeoutRef.current = setTimeout(() => {
        setRevealedCardsOverlay(null);
        revealedCardsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    if (effect.type === 'REVEAL_SEARCHED_CARD_TO_HAND') {
      clearRevealedCardsTimer();
      const actorLabel = getSharedActorLabel(effect.actor, role, usesPlayerLabels, translate);
      const message = translate('gameBoard.modals.shared.messages.revealSearch', { actor: actorLabel });
      const cards: PublicCardView[] = effect.cardIds
        .map((id) => gameStateRef.current.cards.find((card) => card.id === id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card))
        .map((card) => ({
          cardId: card.cardId,
          name: card.name,
          image: '',
        }));

      pushEventHistory(`${message}: ${cards.map((card) => card.name).join(', ')}`);
      setRevealedCardsOverlay({
        type: 'search',
        title: message,
        cards,
      });
      revealedCardsTimeoutRef.current = setTimeout(() => {
        setRevealedCardsOverlay(null);
        revealedCardsTimeoutRef.current = null;
      }, 5000);
      return;
    }

    if (effect.type === 'ATTACK_DECLARED') {
      const formattedAttack = formatAttackEffect(effect, role, usesPlayerLabels, translate);
      clearAttackMessageTimer();
      setAttackMessage(formattedAttack.announcement);
      setAttackVisual(effect);
      setAttackHistory((previous) => prependAttackHistoryEntry(previous, formattedAttack.history));
      pushEventHistory(formattedAttack.history);
      attackMessageTimeoutRef.current = setTimeout(() => {
        setAttackMessage(null);
        setAttackVisual(null);
        attackMessageTimeoutRef.current = null;
      }, 2200);
      return;
    }

    if (effect.type === 'CARD_PLAYED') {
      const message = formatCardPlayedEffect(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'RESET_GAME_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'SHUFFLE_DECK_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'DRAW_CARD_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'MILL_CARD_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'TOP_CARD_TO_EX_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'RANDOM_HAND_DISCARD_COMPLETED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'SEARCHED_CARD_TO_HAND') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'SEARCHED_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'CEMETERY_CARD_TO_HAND') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'CEMETERY_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'EVOLVE_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'EVOLVE_USAGE_TOGGLED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      if (gameStateRef.current.gameStatus === 'playing') {
        pushEventHistory(message);
      }
      return;
    }

    if (effect.type === 'BANISHED_CARD_TO_HAND') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      pushEventHistory(message);
      return;
    }

    if (effect.type === 'BANISHED_CARD_PLACED') {
      const message = formatSharedUiMessage(effect, role, usesPlayerLabels, translate);
      showTimedCardPlayMessage(message, 2600);
      return;
    }

    if (effect.type === 'LOOK_TOP_RESOLVED') {
      const summaryLines = formatSharedUiMessage(effect, role, usesPlayerLabels, translate).split('\n').filter(Boolean);
      pushEventHistory(summaryLines.join('\n'));
      if (revealTopIsActiveRef.current) {
        setRevealedCardsOverlay((previous) => {
          return mergeLookTopSummaryIntoOverlay(previous, summaryLines);
        });
      } else if (effect.revealedHandCards.length > 0) {
        pendingLookTopSummaryLinesRef.current = summaryLines;
      } else {
        const message = summaryLines.join('\n');
        showTimedCardPlayMessage(message, 3200);
      }
      return;
    }

    clearDiceTimers();
    clearCoinMessageTimer();
    setIsRollingDice(true);
    setCoinMessage(null);

    let rolls = 0;
    const maxRolls = 15;
    diceRollIntervalRef.current = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rolls += 1;
      if (rolls >= maxRolls && diceRollIntervalRef.current) {
        clearInterval(diceRollIntervalRef.current);
        diceRollIntervalRef.current = null;
      }
    }, 60);

    diceFinalizeTimeoutRef.current = setTimeout(() => {
      if (diceRollIntervalRef.current) {
        clearInterval(diceRollIntervalRef.current);
        diceRollIntervalRef.current = null;
      }
      setDiceValue(effect.value);
      showTimedCoinMessage(formatSharedUiMessage(effect, role, usesPlayerLabels, translate), 3000);
      diceMessageTimeoutRef.current = setTimeout(() => {
        setIsRollingDice(false);
        setDiceValue(null);
        diceMessageTimeoutRef.current = null;
      }, 800);
      diceFinalizeTimeoutRef.current = null;
    }, 900);
  }, [
    clearAttackMessageTimer,
    clearCoinMessageTimer,
    clearDiceTimers,
    clearRevealedCardsTimer,
    gameStateRef,
    isSoloMode,
    isSpectator,
    pushEventHistory,
    role,
    showTimedCardPlayMessage,
    showTimedCoinMessage,
    tRef,
  ]);

  const playIncomingSharedUiEffects = React.useCallback((
    message: Extract<SyncMessage, { type: 'SHARED_UI_EFFECT' }> | SnapshotMessage
  ) => {
    for (const effect of getIncomingSharedUiEffects(message)) {
      playSharedUiEffect(effect);
    }
  }, [playSharedUiEffect]);

  React.useEffect(() => {
    return () => {
      clearAttackUiState();
      clearCardPlayMessageTimer();
      clearTurnMessage();
      clearCoinMessageTimer();
      clearDiceTimers();
      clearRevealedCardsTimer();
    };
  }, [
    clearAttackUiState,
    clearCardPlayMessageTimer,
    clearCoinMessageTimer,
    clearDiceTimers,
    clearRevealedCardsTimer,
    clearTurnMessage,
  ]);

  return {
    coinMessage,
    turnMessage,
    cardPlayMessage,
    attackMessage,
    attackHistory,
    eventHistory,
    attackVisual,
    revealedCardsOverlay,
    isRollingDice,
    diceValue,
    playSharedUiEffect,
    playIncomingSharedUiEffects,
    clearAttackUiState,
    clearTurnMessage,
    clearTurnMessageTimer,
    showTimedTurnMessage,
  };
};
