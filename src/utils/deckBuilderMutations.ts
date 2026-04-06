import { CLASS } from '../models/class';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckState } from '../models/deckState';
import type { DeckRuleConfig } from '../models/deckRule';
import { DECK_LIMITS, type DeckTargetSection } from './deckBuilderRules';

export const removeLastCardById = (
  cards: DeckBuilderCardData[],
  cardId?: string
): DeckBuilderCardData[] => {
  if (!cardId) return cards;

  const removeIndex = cards.findLastIndex(card => card.id === cardId);
  if (removeIndex < 0) return cards;

  return cards.filter((_, index) => index !== removeIndex);
};

type AddCardToDeckStateOptions = {
  deckRuleConfig: DeckRuleConfig;
  leaderLimit: number;
};

export const addCardToDeckState = (
  current: DeckState,
  card: DeckBuilderCardData,
  targetSection: DeckTargetSection,
  { deckRuleConfig, leaderLimit }: AddCardToDeckStateOptions
): DeckState => {
  switch (targetSection) {
    case 'main':
      if (current.mainDeck.length >= DECK_LIMITS.main) return current;
      return { ...current, mainDeck: [...current.mainDeck, card] };
    case 'evolve':
      if (current.evolveDeck.length >= DECK_LIMITS.evolve) return current;
      return { ...current, evolveDeck: [...current.evolveDeck, card] };
    case 'leader': {
      if (deckRuleConfig.format === 'crossover') {
        const leaderClass = card.class;

        if (!leaderClass || leaderClass === CLASS.NEUTRAL || leaderClass === '-') return current;

        const existingIndex = current.leaderCards.findIndex(leader => leader.class === leaderClass);
        if (existingIndex >= 0) {
          const nextLeaderCards = [...current.leaderCards];
          nextLeaderCards[existingIndex] = card;
          return { ...current, leaderCards: nextLeaderCards };
        }

        if (current.leaderCards.length >= leaderLimit) return current;
        return { ...current, leaderCards: [...current.leaderCards, card] };
      }

      return { ...current, leaderCards: [card] };
    }
    case 'token':
      return { ...current, tokenDeck: [...current.tokenDeck, card] };
  }
};

export const removeCardFromDeckState = (
  current: DeckState,
  targetSection: DeckTargetSection,
  cardId?: string
): DeckState => {
  switch (targetSection) {
    case 'main':
      return { ...current, mainDeck: removeLastCardById(current.mainDeck, cardId) };
    case 'evolve':
      return { ...current, evolveDeck: removeLastCardById(current.evolveDeck, cardId) };
    case 'leader':
      return { ...current, leaderCards: removeLastCardById(current.leaderCards, cardId) };
    case 'token':
      return { ...current, tokenDeck: removeLastCardById(current.tokenDeck, cardId) };
  }
};
