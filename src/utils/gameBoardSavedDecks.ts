import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { getDeckValidationMessages, sanitizeImportedDeckState } from './deckBuilderRules';
import { restoreSavedDeckToSnapshot, type SavedDeckRecordV1 } from './deckStorage';
import {
  formatSavedDeckCountSummary,
  formatSavedDeckRuleSummary,
  type SavedDeckPresentationTranslator,
} from './savedDeckPresentation';

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
): LegalSavedDeckOption[] => (
  savedDecks
    .map(deck => {
      const restored = restoreSavedDeckToSnapshot(deck, allCards);
      if (restored.missingCardIds.length > 0) return null;

      const sanitizedDeckState = sanitizeImportedDeckState(
        restored.snapshot.deckState,
        allCards,
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
    .filter((value): value is LegalSavedDeckOption => value !== null)
);
