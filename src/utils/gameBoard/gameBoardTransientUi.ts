export type GameBoardRevealCard = {
  cardId: string;
  name: string;
  image: string;
};

export type GameBoardRevealedCardsOverlay =
  | {
      type: 'look-top';
      title: string;
      cards: GameBoardRevealCard[];
      summaryLines?: string[];
    }
  | {
      type: 'search';
      title: string;
      cards: GameBoardRevealCard[];
      summaryLines?: string[];
    }
  | {
      type: 'hand';
      title: string;
      cards: GameBoardRevealCard[];
      summaryLines?: string[];
    };

export const prependHistoryEntry = (
  previous: string[],
  entry: string,
  limit: number
): string[] => [entry, ...previous].slice(0, limit);

export const EVENT_HISTORY_LIMIT = 100;

export const prependEventHistoryEntry = (
  previous: string[],
  entry: string
): string[] => prependHistoryEntry(previous, entry, EVENT_HISTORY_LIMIT);

export const prependAttackHistoryEntry = (
  previous: string[],
  entry: string
): string[] => prependHistoryEntry(previous, entry, 3);

export const mergeLookTopSummaryIntoOverlay = (
  previous: GameBoardRevealedCardsOverlay | null,
  summaryLines: string[]
): GameBoardRevealedCardsOverlay | null => {
  if (!previous || previous.type !== 'look-top') return previous;

  return {
    ...previous,
    summaryLines,
  };
};
