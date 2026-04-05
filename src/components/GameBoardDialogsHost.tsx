import React from 'react';
import type { CardInstance } from './Card';
import GameBoardEvolveAutoAttachDialog from './GameBoardEvolveAutoAttachDialog';
import GameBoardSavedDeckPickerDialog from './GameBoardSavedDeckPickerDialog';
import type { CardDetailLookup } from '../utils/cardDetails';
import type { LegalSavedDeckOption } from '../utils/gameBoardSavedDecks';

type EvolveAutoAttachSelection = {
  sourceCard: CardInstance;
  candidateCards: CardInstance[];
};

type GameBoardDialogsHostProps = {
  savedDeckPicker: {
    targetLabel: string;
    savedDeckSearch: string;
    filteredSavedDeckOptions: LegalSavedDeckOption[];
    onBackdropClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onSearchChange: (value: string) => void;
    onLoadDeck: (option: LegalSavedDeckOption) => void;
  } | null;
  evolveAutoAttach: {
    selection: EvolveAutoAttachSelection;
    cardDetailLookup: CardDetailLookup;
    onBackdropClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onCancel: () => void;
    onConfirm: (cardId: string) => void;
  } | null;
};

const GameBoardDialogsHost: React.FC<GameBoardDialogsHostProps> = ({
  savedDeckPicker,
  evolveAutoAttach,
}) => (
  <>
    {savedDeckPicker && (
      <GameBoardSavedDeckPickerDialog
        targetLabel={savedDeckPicker.targetLabel}
        savedDeckSearch={savedDeckPicker.savedDeckSearch}
        filteredSavedDeckOptions={savedDeckPicker.filteredSavedDeckOptions}
        onBackdropClick={savedDeckPicker.onBackdropClick}
        onClose={savedDeckPicker.onClose}
        onSearchChange={savedDeckPicker.onSearchChange}
        onLoadDeck={savedDeckPicker.onLoadDeck}
      />
    )}
    {evolveAutoAttach && (
      <GameBoardEvolveAutoAttachDialog
        sourceCard={evolveAutoAttach.selection.sourceCard}
        candidateCards={evolveAutoAttach.selection.candidateCards}
        cardDetailLookup={evolveAutoAttach.cardDetailLookup}
        onBackdropClick={evolveAutoAttach.onBackdropClick}
        onCancel={evolveAutoAttach.onCancel}
        onConfirm={evolveAutoAttach.onConfirm}
      />
    )}
  </>
);

export default GameBoardDialogsHost;
