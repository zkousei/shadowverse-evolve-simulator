import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { getDeckValidationMessages, createImportedDeckSanitizer } from '../deckBuilder/deckBuilderRules';
import { createSavedDeckRestorer, type SavedDeckRecordV1 } from '../deck/deckStorage';
import {
  formatSavedDeckCountSummary,
  formatSavedDeckRuleSummary,
  type SavedDeckPresentationTranslator,
} from '../deck/savedDeckPresentation';

export type LegalSavedDeckOption = {
  deck: SavedDeckRecordV1;
  deckData: {
    mainDeck: DeckBuilderCardData[];
    evolveDeck: DeckBuilderCardData[];
    leaderCards: DeckBuilderCardData[];
    tokenDeck: DeckBuilderCardData[];
  };
  summary: string;
  counts: string;
};

export const buildLegalSavedDeckOptions = (
  savedDecks: SavedDeckRecordV1[],
  allCards: DeckBuilderCardData[],
  t: SavedDeckPresentationTranslator
): LegalSavedDeckOption[] => {
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

      return {
        deck,
        deckData: {
          mainDeck: sanitizedDeckState.mainDeck,
          evolveDeck: sanitizedDeckState.evolveDeck,
          leaderCards: sanitizedDeckState.leaderCards,
          tokenDeck: sanitizedDeckState.tokenDeck,
        },
        summary: formatSavedDeckRuleSummary(deck, t),
        counts: formatSavedDeckCountSummary(deck, t),
      } satisfies LegalSavedDeckOption;
    })
    .filter((value): value is LegalSavedDeckOption => value !== null);
};
