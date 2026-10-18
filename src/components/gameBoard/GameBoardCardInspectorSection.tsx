import type { GameBoardCatalogStatus } from '../../hooks/gameBoard/useGameBoardCatalogResources';
import React from 'react';
import type { CardInstance } from '../Card';
import GameBoardCardInspector from './GameBoardCardInspector';
import type {
  CardDetail,
  CardDetailPresentation,
} from '../../utils/card/cardDetails';

type GameBoardCardInspectorSectionProps = {
  catalogStatus?: GameBoardCatalogStatus;
  selectedInspectorCard: CardInstance | null;
  selectedInspectorDetail?: CardDetail | null;
  inspectorPresentation: CardDetailPresentation;
  inspectorPopoverStyle: React.CSSProperties | null;
  onClose: () => void;
};

const GameBoardCardInspectorSection = React.forwardRef<
  HTMLDivElement,
  GameBoardCardInspectorSectionProps
>(
  ({
    catalogStatus = 'ready',
    selectedInspectorCard,
    selectedInspectorDetail,
    inspectorPresentation,
    inspectorPopoverStyle,
    onClose,
  }, ref) => {
    if (!selectedInspectorCard || !inspectorPopoverStyle) return null;

    return (
      <GameBoardCardInspector
        ref={ref}
        catalogStatus={catalogStatus}
        selectedInspectorCard={selectedInspectorCard}
        selectedInspectorDetail={selectedInspectorDetail}
        inspectorPresentation={inspectorPresentation}
        inspectorPopoverStyle={inspectorPopoverStyle}
        onClose={onClose}
      />
    );
  }
);

GameBoardCardInspectorSection.displayName = 'GameBoardCardInspectorSection';

export default GameBoardCardInspectorSection;
