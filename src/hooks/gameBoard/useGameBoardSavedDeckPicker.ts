import React from 'react';
import type { ImportableDeckData } from '../../utils/gameBoard/gameBoardDeckActions';
import { canImportDeck } from '../../utils/gameBoard/gameRules';
import { buildLegalSavedDeckOptions, buildSavedDeckPickerOptions, type SavedDeckPickerOption, type LegalSavedDeckOption } from '../../utils/gameBoard/gameBoardSavedDecks';
import { getSavedDeckById, listSavedDecks } from '../../utils/deck/deckStorage';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { buildSavedDeckPickerViewModel } from './gameBoardDialogViewModel';
import type { PendingDeckImport } from './useGameBoardSetupActions';
import type { SavedDeckRecordV1 } from '../../utils/deck/deckStorage';
import type { PlayerRole, SyncState } from '../../types/game';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type UseGameBoardSavedDeckPickerArgs = {
  beginDeckImport: (target: PlayerRole) => PendingDeckImport | null;
  resolveSavedDeckCards?: (deck: SavedDeckRecordV1) => Promise<DeckBuilderCardData[]>;
  catalogCards: DeckBuilderCardData[];
  gameState: SyncState;
  importDeckData: (deckData: ImportableDeckData, targetRole?: PlayerRole) => void;
  isSoloMode: boolean;
  role: PlayerRole;
  t: TranslationFn;
};

export const useGameBoardSavedDeckPicker = ({
  beginDeckImport,
  resolveSavedDeckCards,
  catalogCards,
  gameState,
  importDeckData,
  isSoloMode,
  role,
  t,
}: UseGameBoardSavedDeckPickerArgs) => {
  const allCardsLength = catalogCards.length;
  const [isSavedDeckLoading, setIsSavedDeckLoading] = React.useState(false);
  const [savedDeckLoadFailed, setSavedDeckLoadFailed] = React.useState(false);
  const mounted = React.useRef(false);
  const pending = React.useRef<{ ticket: PendingDeckImport; catalog: DeckBuilderCardData[]; role: PlayerRole; target: PlayerRole; resolver: typeof resolveSavedDeckCards } | null>(null);
  const cancelPendingLoad = React.useCallback(() => {
    pending.current?.ticket.cancel();
    pending.current = null;
    setIsSavedDeckLoading(false);
    setSavedDeckLoadFailed(false);
  }, []);
  React.useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.ticket.cancel(); pending.current = null; };
  }, []);
  React.useLayoutEffect(() => {
    const request = pending.current;
    if (request && (request.catalog !== catalogCards || request.role !== role || request.resolver !== resolveSavedDeckCards ||
        !canImportDeck(gameState, request.target) || !request.ticket.isCurrent())) cancelPendingLoad();
  }, [catalogCards, gameState, role, resolveSavedDeckCards, cancelPendingLoad]);
  const [savedDeckOptions, setSavedDeckOptions] = React.useState<SavedDeckPickerOption[]>([]);
  const [savedDeckSearch, setSavedDeckSearch] = React.useState('');
  const [savedDeckImportTargetRole, setSavedDeckImportTargetRole] = React.useState<PlayerRole | null>(null);
  const refreshSavedDeckOptions = React.useCallback(() => {
    if (catalogCards.length === 0) {
      setSavedDeckOptions([]);
      return;
    }

    setSavedDeckOptions(buildSavedDeckPickerOptions(listSavedDecks(), catalogCards, t));
  }, [catalogCards, t]);

  const openSavedDeckPicker = React.useCallback((targetRole: PlayerRole) => {
    if (catalogCards.length === 0) return;
    if (!canImportDeck(gameState, targetRole)) return;

    cancelPendingLoad();
    refreshSavedDeckOptions();
    setSavedDeckSearch('');
    setSavedDeckImportTargetRole(targetRole);
  }, [catalogCards, cancelPendingLoad, gameState, refreshSavedDeckOptions]);

  const closeSavedDeckPicker = React.useCallback(() => {
    cancelPendingLoad();
    setSavedDeckImportTargetRole(null);
    setSavedDeckSearch('');
  }, [cancelPendingLoad]);

  const handleSavedDeckImport = React.useCallback(async (option: SavedDeckPickerOption): Promise<void> => {
    const target = savedDeckImportTargetRole;
    if (!mounted.current || !target || !canImportDeck(gameState, target)) return;
    cancelPendingLoad();
    const currentDeck = getSavedDeckById(option.deck.id);
    if (!currentDeck || JSON.stringify(currentDeck) !== JSON.stringify(option.deck)) {
      refreshSavedDeckOptions();
      return;
    }
    const [expected] = buildLegalSavedDeckOptions([currentDeck], catalogCards, t);
    if (!expected) { refreshSavedDeckOptions(); return; }
    // Keep the existing sanitized section order/counts and automatic tokens.
    // A partial response must not silently omit a known related token.
    const expectedIds = getSectionIds(expected.deckData);
    const recordKey = JSON.stringify(currentDeck);
    const ticket = beginDeckImport(target);
    if (!ticket) return;
    const request = { ticket, catalog: catalogCards, role, target, resolver: resolveSavedDeckCards };
    pending.current = request;
    setIsSavedDeckLoading(true);
    const isCurrent = () => mounted.current && pending.current === request && ticket.isCurrent();
    let commitStarted = false;
    try {
      // The current source is complete in memory. A pinned detail reader can
      // replace this resolver later without changing the commit/cancel rules.
      const cards = await (resolveSavedDeckCards?.(currentDeck) ?? Promise.resolve(catalogCards));
      if (!isCurrent()) return;
      const latestDeck = getSavedDeckById(currentDeck.id);
      if (!latestDeck || JSON.stringify(latestDeck) !== recordKey) {
        refreshSavedDeckOptions();
        return;
      }
      const [resolved] = buildLegalSavedDeckOptions([latestDeck], cards, t);
      if (!resolved || getSectionIds(resolved.deckData) !== expectedIds) {
        setSavedDeckLoadFailed(true);
        return;
      }
      // No await between the final guard, storage check and atomic import.
      if (!isCurrent()) return;
      commitStarted = true;
      importDeckData(resolved.deckData, target);
      closeSavedDeckPicker();
    } catch {
      if (isCurrent() || (commitStarted && mounted.current && pending.current === request)) setSavedDeckLoadFailed(true);
    } finally {
      ticket.cancel();
      if (pending.current === request) {
        pending.current = null;
        if (mounted.current) setIsSavedDeckLoading(false);
      }
    }
  }, [beginDeckImport, cancelPendingLoad, catalogCards, closeSavedDeckPicker, gameState, importDeckData, refreshSavedDeckOptions, resolveSavedDeckCards, role, savedDeckImportTargetRole, t]);

  const { filteredSavedDeckOptions, savedDeckPickerTargetLabel } = buildSavedDeckPickerViewModel({
    savedDeckOptions,
    savedDeckSearch,
    savedDeckImportTargetRole,
    isSoloMode,
    role,
    t,
  });

  return {
    isSavedDeckLoading, savedDeckLoadFailed,
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

const getSectionIds = (data: LegalSavedDeckOption['deckData']): string =>
  JSON.stringify([data.mainDeck, data.evolveDeck, data.leaderCards, data.tokenDeck].map(cards => cards.map(card => card.id)));
