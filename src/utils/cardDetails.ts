export interface CardDetail {
  id: string;
  name: string;
  image: string;
  className: string;
  title: string;
  type: string;
  subtype: string;
  cardKindNormalized?: string;
  cost: string;
  atk: number | null;
  hp: number | null;
  abilityText: string;
}

export type CardDetailLookup = Record<string, CardDetail>;
export type CardDetailPresentation = {
  primaryMeta: string;
  secondaryMeta: string;
  stats: string | null;
};

interface CardDetailSource {
  id: string;
  name?: string;
  image?: string;
  class?: string;
  title?: string;
  type?: string;
  subtype?: string;
  card_kind_normalized?: string;
  cost?: string;
  atk?: string;
  hp?: string;
  ability_text?: string;
}

const parseNumericStat = (value?: string): number | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-') return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const buildCardDetailLookup = (cards: CardDetailSource[]): CardDetailLookup => (
  cards.reduce<CardDetailLookup>((lookup, card) => {
    lookup[card.id] = {
      id: card.id,
      name: card.name ?? '',
      image: card.image ?? '',
      className: card.class ?? '',
      title: card.title ?? '',
      type: card.type ?? '',
      subtype: card.subtype ?? '',
      cardKindNormalized: card.card_kind_normalized ?? '',
      cost: card.cost ?? '-',
      atk: parseNumericStat(card.atk),
      hp: parseNumericStat(card.hp),
      abilityText: card.ability_text ?? '',
    };

    return lookup;
  }, {})
);

export const formatAbilityText = (abilityText: string): string => (
  abilityText
    .replaceAll(' ---------- ', '\n\n----------\n\n')
    .replaceAll(' ――――――――――――――― ', '\n\n―――――――――――――――\n\n')
);

export const buildCardDetailPresentation = (
  detail?: Pick<CardDetail, 'className' | 'title' | 'type' | 'subtype' | 'atk' | 'hp'> | null
): CardDetailPresentation => ({
  primaryMeta: [detail?.className, detail?.title].filter(Boolean).join(' / '),
  secondaryMeta: [detail?.type, detail?.subtype].filter(Boolean).join(' / '),
  stats: detail && detail.atk !== null && detail.hp !== null
    ? `${detail.atk} / ${detail.hp}`
    : null,
});
