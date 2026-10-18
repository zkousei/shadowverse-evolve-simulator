import React from 'react';
import type { ImportableDeckData } from '../../utils/gameBoard/gameBoardDeckActions';
import { canImportDeck } from '../../utils/gameBoard/gameRules';
import { buildLegalSavedDeckOptions, type LegalSavedDeckOption } from '../../utils/gameBoard/gameBoardSavedDecks';
import { getSavedDeckById, listSavedDecks } from '../../utils/deck/deckStorage';
import { loadCardCatalog } from '../../utils/card/cardCatalog';
import { buildSavedDeckPickerViewModel } from './gameBoardDialogViewModel';
import type { PlayerRole, SyncState } from '../../types/game';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type UseGameBoardSavedDeckPickerArgs = {
  gameState: SyncState;
  importDeckData: (deckData: ImportableDeckData, targetRole?: PlayerRole) => void;
  isSoloMode: boolean;
  role: PlayerRole;
  t: TranslationFn;
};

export const useGameBoardSavedDeckPicker = ({
  gameState,
  importDeckData,
  isSoloMode,
  role,
  t,
}: UseGameBoardSavedDeckPickerArgs) => {
  const [allCardsLength, setAllCardsLength] = React.useState(0);
  const [savedDeckOptions, setSavedDeckOptions] = React.useState<LegalSavedDeckOption[]>([]);
  const [savedDeckSearch, setSavedDeckSearch] = React.useState('');
  const [savedDeckImportTargetRole, setSavedDeckImportTargetRole] = React.useState<PlayerRole | null>(null);
  const allCardsRef = React.useRef<Awaited<ReturnType<typeof loadCardCatalog>>>([]);

  React.useEffect(() => {
    loadCardCatalog()
      .then((data) => {
        allCardsRef.current = data;
        setAllCardsLength(data.length);
      })
      .catch((err) => console.error('Could not load card details', err));
  }, []);

  const refreshSavedDeckOptions = React.useCallback(() => {
    if (allCardsRef.current.length === 0) {
      setSavedDeckOptions([]);
      return;
    }

    setSavedDeckOptions(buildLegalSavedDeckOptions(listSavedDecks(), allCardsRef.current, t));
  }, [t]);

  const openSavedDeckPicker = React.useCallback((targetRole: PlayerRole) => {
    if (allCardsRef.current.length === 0) return;
    if (!canImportDeck(gameState, targetRole)) return;

    refreshSavedDeckOptions();
    setSavedDeckSearch('');
    setSavedDeckImportTargetRole(targetRole);
  }, [gameState, refreshSavedDeckOptions]);

  const closeSavedDeckPicker = React.useCallback(() => {
    setSavedDeckImportTargetRole(null);
    setSavedDeckSearch('');
  }, []);

  const handleSavedDeckImport = React.useCallback((option: LegalSavedDeckOption) => {
    if (!savedDeckImportTargetRole) return;
    if (!canImportDeck(gameState, savedDeckImportTargetRole)) return;

    const currentDeck = getSavedDeckById(option.deck.id);
    // A different tab may have edited/deleted the record since the list opened.
    // Refresh first so the user can review the new selection before importing it.
    if (!currentDeck || JSON.stringify(currentDeck) !== JSON.stringify(option.deck)) {
      refreshSavedDeckOptions();
      return;
    }

    const [currentOption] = buildLegalSavedDeckOptions([currentDeck], allCardsRef.current, t);
    if (!currentOption) {
      refreshSavedDeckOptions();
      return;
    }

    importDeckData(currentOption.deckData, savedDeckImportTargetRole);
    closeSavedDeckPicker();
  }, [closeSavedDeckPicker, gameState, importDeckData, refreshSavedDeckOptions, savedDeckImportTargetRole, t]);

  const { filteredSavedDeckOptions, savedDeckPickerTargetLabel } = buildSavedDeckPickerViewModel({
    savedDeckOptions,
    savedDeckSearch,
    savedDeckImportTargetRole,
    isSoloMode,
    role,
    t,
  });

  return {
    allCardsLength,
    savedDeckSearch,
    setSavedDeckSearch,
    savedDeckImportTargetRole,
    filteredSavedDeckOptions,
    savedDeckPickerTargetLabel,
    openSavedDeckPicker,
    closeSavedDeckPicker,
    handleSavedDeckImport,
  };
};
