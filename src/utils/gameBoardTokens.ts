import type { TokenOption } from '../types/game';

export const getTotalTokenSpawnCount = (
  tokenOptions: TokenOption[],
  tokenSpawnCounts: Record<string, number>
): number => tokenOptions.reduce(
  (total, token) => total + (tokenSpawnCounts[token.cardId] ?? 0),
  0
);

export const updateTokenSpawnCounts = (
  current: Record<string, number>,
  cardId: string,
  delta: number,
  maxCount = 5
): Record<string, number> => {
  const nextCount = Math.max(0, Math.min(maxCount, (current[cardId] ?? 0) + delta));
  if (nextCount === 0) {
    const { [cardId]: omittedCardId, ...rest } = current;
    void omittedCardId;
    return rest;
  }

  return {
    ...current,
    [cardId]: nextCount,
  };
};

export const buildTokenSpawnSelections = (
  tokenOptions: TokenOption[],
  tokenSpawnCounts: Record<string, number>
): Array<{ tokenOption: TokenOption; count: number }> => (
  tokenOptions.map(tokenOption => ({
    tokenOption,
    count: tokenSpawnCounts[tokenOption.cardId] ?? 0,
  }))
);
