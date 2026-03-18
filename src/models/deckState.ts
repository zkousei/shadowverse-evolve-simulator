import type { DeckBuilderCardData } from './deckBuilderCard';

export type DeckState = {
  mainDeck: DeckBuilderCardData[];
  evolveDeck: DeckBuilderCardData[];
  leaderCard: DeckBuilderCardData | null;
  tokenDeck: DeckBuilderCardData[];
};

export const createEmptyDeckState = (): DeckState => ({
  mainDeck: [],
  evolveDeck: [],
  leaderCard: null,
  tokenDeck: [],
});
