export interface BaseCardStats {
  atk: number;
  hp: number;
}

export type CardStatLookup = Record<string, BaseCardStats>;

interface CardStatsSource {
  id: string;
  atk?: string;
  hp?: string;
}

const parseNumericStat = (value?: string): number | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-') return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const buildCardStatLookup = (cards: CardStatsSource[]): CardStatLookup => (
  cards.reduce<CardStatLookup>((lookup, card) => {
    const atk = parseNumericStat(card.atk);
    const hp = parseNumericStat(card.hp);

    if (atk === null || hp === null) return lookup;

    lookup[card.id] = { atk, hp };
    return lookup;
  }, {})
);
