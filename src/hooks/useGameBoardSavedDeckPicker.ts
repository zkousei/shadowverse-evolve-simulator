import React from 'react';
import type { ImportableDeckData } from '../utils/gameBoardDeckActions';
import { canImportDeck } from '../utils/gameRules';
import { buildLegalSavedDeckOptions, type LegalSavedDeckOption } from '../utils/gameBoardSavedDecks';
import { listSavedDecks } from '../utils/deckStorage';
import { loadCardCatalog } from '../utils/cardCatalog';
import { buildSavedDeckPickerViewModel } from './gameBoardDialogViewModel';
import type { PlayerRole, SyncState } from '../types/game';

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

    importDeckData(option.deckData, savedDeckImportTargetRole);
    closeSavedDeckPicker();
  }, [closeSavedDeckPicker, gameState, importDeckData, savedDeckImportTargetRole]);

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
