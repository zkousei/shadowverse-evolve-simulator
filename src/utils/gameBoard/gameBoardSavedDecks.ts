import type { DeckRuleCard } from '../../models/deckRuleCard';
import type { DeckState } from '../../models/deckState';
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

const mapLegalSavedDeckOptions = <Card extends DeckRuleCard, T extends object>(
  savedDecks: SavedDeckRecordV1[],
  allCards: readonly Card[],
  t: SavedDeckPresentationTranslator,
  project: (option: SavedDeckPickerOption & { deckData: DeckState<Card> }) => T
): T[] => {
  if (savedDecks.length === 0) return [];
  const restoreSavedDeck = createSavedDeckRestorer(allCards);
  let sanitizeDeck: ReturnType<typeof createImportedDeckSanitizer<Card>> | undefined;
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
      } satisfies SavedDeckPickerOption & { deckData: DeckState<Card> });
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
  allCards: readonly DeckRuleCard[],
  t: SavedDeckPresentationTranslator
): SavedDeckPickerOption[] => mapLegalSavedDeckOptions(savedDecks, allCards, t,
  ({ deck, summary, counts }) => ({ deck, summary, counts })
);

/** IDs/order/counts only, never a partial card payload for the game. */
export const getSavedDeckSectionSignature = (data: DeckState<Pick<DeckRuleCard, 'id'>>): string =>
  JSON.stringify([data.mainDeck, data.evolveDeck, data.leaderCards, data.tokenDeck].map(cards => cards.map(card => card.id)));

export const buildSavedDeckImportSignature = (
  deck: SavedDeckRecordV1,
  allCards: readonly DeckRuleCard[],
  t: SavedDeckPresentationTranslator
): string | null => {
  const [result] = mapLegalSavedDeckOptions([deck], allCards, t,
    option => ({ signature: getSavedDeckSectionSignature(option.deckData) }));
  return result?.signature ?? null;
};
