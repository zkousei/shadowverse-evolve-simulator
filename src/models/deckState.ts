import type { DeckBuilderCardData } from './deckBuilderCard';

export type DeckState = {
  mainDeck: DeckBuilderCardData[];
  evolveDeck: DeckBuilderCardData[];
  leaderCards: DeckBuilderCardData[];
  tokenDeck: DeckBuilderCardData[];
};

export const createEmptyDeckState = (): DeckState => ({
  mainDeck: [],
  evolveDeck: [],
  leaderCards: [],
  tokenDeck: [],
});
