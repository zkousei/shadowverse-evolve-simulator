import React from 'react';
import type { ImportableDeckData } from '../../utils/gameBoard/gameBoardDeckActions';
import { canImportDeck } from '../../utils/gameBoard/gameRules';
import { buildLegalSavedDeckOptions, buildSavedDeckPickerOptions, buildSavedDeckImportSignature, getSavedDeckSectionSignature, type SavedDeckPickerOption } from '../../utils/gameBoard/gameBoardSavedDecks';
import type { GameBoardSavedDeckReader } from '../../utils/gameBoard/gameBoardSavedDeckReader';
import { getSavedDeckById, listSavedDecks } from '../../utils/deck/deckStorage';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { buildSavedDeckPickerViewModel } from './gameBoardDialogViewModel';
import type { PendingDeckImport } from './useGameBoardSetupActions';
import type { SavedDeckRecordV1 } from '../../utils/deck/deckStorage';
import type { PlayerRole, SyncState } from '../../types/game';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type UseGameBoardSavedDeckPickerArgs = {
  beginDeckImport: (target: PlayerRole) => PendingDeckImport | null;
  gameState: SyncState;
  importDeckData: (deckData: ImportableDeckData, targetRole?: PlayerRole) => void;
  isSoloMode: boolean;
  role: PlayerRole;
  t: TranslationFn;
} & ({
  catalogCards: DeckBuilderCardData[];
  resolveSavedDeckCards?: (deck: SavedDeckRecordV1) => Promise<DeckBuilderCardData[]>;
  generatedCatalog?: never;
} | {
  /** Keep the reader instance stable for one pinned catalog lifetime. */
  generatedCatalog: GameBoardSavedDeckReader;
  catalogCards?: never;
  resolveSavedDeckCards?: never;
});

export const useGameBoardSavedDeckPicker = (args: UseGameBoardSavedDeckPickerArgs) => {
  const { beginDeckImport, gameState, importDeckData, isSoloMode, role, t } = args;
  const catalog = React.useMemo(() => {
    if (args.generatedCatalog) return {
      cards: args.generatedCatalog.summaries,
      loadCards: args.generatedCatalog.loadCards,
    };
    const cards = args.catalogCards;
    return { cards, loadCards: args.resolveSavedDeckCards ?? (() => Promise.resolve(cards)) };
  }, [args.generatedCatalog, args.catalogCards, args.resolveSavedDeckCards]);
  const catalogCards = catalog.cards;
  const allCardsLength = catalogCards.length;
  const [isSavedDeckLoading, setIsSavedDeckLoading] = React.useState(false);
  const [savedDeckLoadFailed, setSavedDeckLoadFailed] = React.useState(false);
  const mounted = React.useRef(false);
  const pending = React.useRef<{ ticket: PendingDeckImport; catalog: typeof catalog; role: PlayerRole; target: PlayerRole } | null>(null);
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
    if (request && (request.catalog !== catalog || request.role !== role ||
        !canImportDeck(gameState, request.target) || !request.ticket.isCurrent())) cancelPendingLoad();
  }, [catalog, gameState, role, cancelPendingLoad]);
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
    const expectedIds = buildSavedDeckImportSignature(currentDeck, catalogCards, t);
    if (expectedIds === null) { refreshSavedDeckOptions(); return; }
    // Keep the existing sanitized section order/counts and automatic tokens.
    // A partial response must not silently omit a known related token.
    const recordKey = JSON.stringify(currentDeck);
    const ticket = beginDeckImport(target);
    if (!ticket) return;
    const request = { ticket, catalog, role, target };
    pending.current = request;
    setIsSavedDeckLoading(true);
    const isCurrent = () => mounted.current && pending.current === request && ticket.isCurrent();
    let commitStarted = false;
    try {
      // Generated summaries stay in validation. Only the reader's complete
      // details may be restored and committed as a game payload.
      const cards = await catalog.loadCards(currentDeck);
      if (!isCurrent()) return;
      const latestDeck = getSavedDeckById(currentDeck.id);
      if (!latestDeck || JSON.stringify(latestDeck) !== recordKey) {
        refreshSavedDeckOptions();
        return;
      }
      const [resolved] = buildLegalSavedDeckOptions([latestDeck], cards, t);
      if (!resolved || getSavedDeckSectionSignature(resolved.deckData) !== expectedIds) {
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
  }, [beginDeckImport, cancelPendingLoad, catalog, catalogCards, closeSavedDeckPicker, gameState, importDeckData, refreshSavedDeckOptions, role, savedDeckImportTargetRole, t]);

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
