import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { getDeckValidationMessages, createImportedDeckSanitizer } from '../deckBuilder/deckBuilderRules';
import { createSavedDeckRestorer, type SavedDeckRecordV1 } from '../deck/deckStorage';
import {
  formatSavedDeckCountSummary,
  formatSavedDeckRuleSummary,
  type SavedDeckPresentationTranslator,
} from '../deck/savedDeckPresentation';

/** Picker rows contain compact saved IDs and presentation only. */
export type SavedDeckPickerOption = {
  deck: SavedDeckRecordV1;
  summary: string;
  counts: string;
};

/** Only a freshly restored full option can supply data for an import. */
export type LegalSavedDeckOption = SavedDeckPickerOption & {
  deckData: {
    mainDeck: DeckBuilderCardData[];
    evolveDeck: DeckBuilderCardData[];
    leaderCards: DeckBuilderCardData[];
    tokenDeck: DeckBuilderCardData[];
  };
};

const mapLegalSavedDeckOptions = <T extends SavedDeckPickerOption>(
  savedDecks: SavedDeckRecordV1[],
  allCards: DeckBuilderCardData[],
  t: SavedDeckPresentationTranslator,
  project: (option: LegalSavedDeckOption) => T
): T[] => {
  if (savedDecks.length === 0) return [];
  const restoreSavedDeck = createSavedDeckRestorer(allCards);
  let sanitizeDeck: ReturnType<typeof createImportedDeckSanitizer> | undefined;
  return savedDecks
    .map(deck => {
      const restored = restoreSavedDeck(deck);
      if (restored.missingCardIds.length > 0) return null;

      sanitizeDeck ??= createImportedDeckSanitizer(allCards);
      const sanitizedDeckState = sanitizeDeck(
        restored.snapshot.deckState,
        restored.snapshot.ruleConfig
      );
      const issues = getDeckValidationMessages(sanitizedDeckState, restored.snapshot.ruleConfig);
      if (issues.length > 0) return null;

      return project({
        deck,
        deckData: {
          mainDeck: sanitizedDeckState.mainDeck,
          evolveDeck: sanitizedDeckState.evolveDeck,
          leaderCards: sanitizedDeckState.leaderCards,
          tokenDeck: sanitizedDeckState.tokenDeck,
        },
        summary: formatSavedDeckRuleSummary(deck, t),
        counts: formatSavedDeckCountSummary(deck, t),
      } satisfies LegalSavedDeckOption);
    })
    .filter((value): value is T => value !== null);
};


export const buildLegalSavedDeckOptions = (
  savedDecks: SavedDeckRecordV1[],
  allCards: DeckBuilderCardData[],
  t: SavedDeckPresentationTranslator
): LegalSavedDeckOption[] => mapLegalSavedDeckOptions(savedDecks, allCards, t, option => option);

export const buildSavedDeckPickerOptions = (
  savedDecks: SavedDeckRecordV1[],
  allCards: DeckBuilderCardData[],
  t: SavedDeckPresentationTranslator
): SavedDeckPickerOption[] => mapLegalSavedDeckOptions(savedDecks, allCards, t,
  ({ deck, summary, counts }) => ({ deck, summary, counts })
);
