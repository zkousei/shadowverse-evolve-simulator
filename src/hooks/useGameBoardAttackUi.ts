import React from 'react';
import type { CardInstance } from '../components/Card';
import type { CardStatLookup } from '../utils/cardStats';
import {
  canStartAttack,
  getAttackHighlightTone as resolveAttackHighlightTone,
  shouldClearAttackSource,
  shouldDisableQuickActionsForAttackTarget as shouldDisableQuickActionsForAttackTargetCard,
} from '../utils/gameBoardCombat';
import {
  shouldDismissAttackModeOnPointerDown,
  shouldDismissOnEscapeKey,
} from '../utils/gameBoardDismissals';
import { getZoneOwner } from '../utils/soloMode';
import type { AttackTarget } from '../types/sync';
import type { SyncState } from '../types/game';

type UseGameBoardAttackUiArgs = {
  canInteract: boolean;
  cards: CardInstance[];
  cardStatLookup: CardStatLookup;
  gameStatus: SyncState['gameStatus'];
  turnPlayer: SyncState['turnPlayer'];
  handleDeclareAttack: (attackerCardId: string, target: AttackTarget, actor?: SyncState['turnPlayer']) => void;
  onAttackModeStarted?: () => void;
};

export const useGameBoardAttackUi = ({
  canInteract,
  cards,
  cardStatLookup,
  gameStatus,
  turnPlayer,
  handleDeclareAttack,
  onAttackModeStarted,
}: UseGameBoardAttackUiArgs) => {
  const [attackSourceCardId, setAttackSourceCardId] = React.useState<string | null>(null);

  const attackSourceCard = attackSourceCardId
    ? cards.find((card) => card.id === attackSourceCardId) ?? null
    : null;
  const attackSourceController = attackSourceCard ? getZoneOwner(attackSourceCard.zone) : null;

  const clearAttackSource = React.useCallback(() => {
    setAttackSourceCardId(null);
  }, []);

  const handleAttackTargetSelect = React.useCallback((target: AttackTarget) => {
    if (!attackSourceCard) return;

    handleDeclareAttack(
      attackSourceCard.id,
      target,
      attackSourceController ?? attackSourceCard.owner
    );
    setAttackSourceCardId(null);
  }, [attackSourceCard, attackSourceController, handleDeclareAttack]);

  const handleStartAttack = React.useCallback((cardId: string) => {
    if (!canInteract) return;

    const card = cards.find((entry) => entry.id === cardId);
    if (!canStartAttack(card, cardStatLookup, gameStatus, turnPlayer)) return;

    onAttackModeStarted?.();
    setAttackSourceCardId((current) => (current === cardId ? null : cardId));
  }, [canInteract, cardStatLookup, cards, gameStatus, onAttackModeStarted, turnPlayer]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const sourceCard = cards.find((card) => card.id === attackSourceCardId);
    if (shouldClearAttackSource(sourceCard, gameStatus, turnPlayer)) {
      setAttackSourceCardId(null);
    }
  }, [attackSourceCardId, cards, gameStatus, turnPlayer]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldDismissOnEscapeKey(event.key)) return;
      setAttackSourceCardId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attackSourceCardId]);

  React.useEffect(() => {
    if (!attackSourceCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!shouldDismissAttackModeOnPointerDown(target)) return;
      setAttackSourceCardId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [attackSourceCardId]);

  const getAttackHighlightTone = React.useCallback((card: CardInstance): 'attack-source' | 'attack-target' | undefined => {
    return resolveAttackHighlightTone(attackSourceCard, card, cardStatLookup);
  }, [attackSourceCard, cardStatLookup]);

  const shouldDisableQuickActionsForAttackTarget = React.useCallback((card: CardInstance): boolean => {
    return shouldDisableQuickActionsForAttackTargetCard(attackSourceCard, card);
  }, [attackSourceCard]);

  return {
    attackSourceCard,
    attackSourceController,
    handleStartAttack,
    handleAttackTargetSelect,
    getAttackHighlightTone,
    shouldDisableQuickActionsForAttackTarget,
    clearAttackSource,
  };
};
