import React from 'react';
import type { CardInspectAnchor, CardInstance } from '../components/Card';
import { canInspectCard, shouldClearInspectorSelection } from '../utils/gameBoardCombat';
import type { CardDetailLookup } from '../utils/cardDetails';
import { buildCardDetailPresentation } from '../utils/cardDetails';
import { getInspectorPopoverStyle } from '../utils/gameBoardPresentation';
import {
  shouldDismissInspectorOnPointerDown,
  shouldDismissOnEscapeKey,
} from '../utils/gameBoardDismissals';
import type { AttackTarget } from '../types/sync';

type UseGameBoardInspectorUiArgs = {
  cards: CardInstance[];
  cardDetailLookup: CardDetailLookup;
  getAttackTargetFromCard: (card: CardInstance) => AttackTarget | null;
  handleAttackTargetSelect: (target: AttackTarget) => void;
};

export const useGameBoardInspectorUi = ({
  cards,
  cardDetailLookup,
  getAttackTargetFromCard,
  handleAttackTargetSelect,
}: UseGameBoardInspectorUiArgs) => {
  const [selectedInspectorCardId, setSelectedInspectorCardId] = React.useState<string | null>(null);
  const [selectedInspectorAnchor, setSelectedInspectorAnchor] = React.useState<CardInspectAnchor | null>(null);
  const inspectorRef = React.useRef<HTMLDivElement | null>(null);

  const closeInspector = React.useCallback(() => {
    setSelectedInspectorCardId(null);
    setSelectedInspectorAnchor(null);
  }, []);

  const handleInspectCard = React.useCallback((card: CardInstance, anchor: CardInspectAnchor) => {
    const attackTarget = getAttackTargetFromCard(card);
    if (attackTarget) {
      handleAttackTargetSelect(attackTarget);
      return;
    }

    if (!canInspectCard(card)) return;

    if (selectedInspectorCardId === card.id) {
      closeInspector();
      return;
    }

    setSelectedInspectorCardId(card.id);
    setSelectedInspectorAnchor(anchor);
  }, [closeInspector, getAttackTargetFromCard, handleAttackTargetSelect, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const selectedCard = cards.find((card) => card.id === selectedInspectorCardId);
    if (shouldClearInspectorSelection(selectedCard)) {
      closeInspector();
    }
  }, [cards, closeInspector, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldDismissOnEscapeKey(event.key)) return;
      closeInspector();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInspector, selectedInspectorCardId]);

  React.useEffect(() => {
    if (!selectedInspectorCardId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!shouldDismissInspectorOnPointerDown(target, inspectorRef.current)) return;
      closeInspector();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [closeInspector, selectedInspectorCardId]);

  const selectedInspectorCard = selectedInspectorCardId
    ? cards.find((card) => card.id === selectedInspectorCardId) ?? null
    : null;
  const selectedInspectorDetail = selectedInspectorCard
    ? cardDetailLookup[selectedInspectorCard.cardId]
    : null;
  const inspectorPresentation = buildCardDetailPresentation(selectedInspectorDetail);
  const inspectorPopoverStyle = React.useMemo<React.CSSProperties | null>(() => {
    if (!selectedInspectorAnchor) return null;

    return getInspectorPopoverStyle(selectedInspectorAnchor, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [selectedInspectorAnchor]);

  return {
    inspectorRef,
    selectedInspectorCard,
    selectedInspectorDetail,
    inspectorPresentation,
    inspectorPopoverStyle,
    handleInspectCard,
    closeInspector,
  };
};
