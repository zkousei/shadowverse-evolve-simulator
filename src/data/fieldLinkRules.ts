import type { DeckBuilderCardData } from '../models/deckBuilderCard';

export interface FieldLinkRuleMember {
  name: string;
  title: string;
  cardKindNormalized: string;
  deckSection: string;
}

export interface FieldLinkRuleGroup {
  id: string;
  members: FieldLinkRuleMember[];
}

export const FIELD_LINK_RULE_GROUPS: FieldLinkRuleGroup[] = [
  {
    id: 'vanguard-drive-point',
    members: [
      {
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
    ],
  },
  {
    id: 'umamusume-carrot-like',
    members: [
      {
        name: 'にんじん',
        title: 'ウマ娘 プリティーダービー',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
      {
        name: '開催大成功！',
        title: 'ウマ娘 プリティーダービー',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
      {
        name: '聖なる夜に重なるキセキ',
        title: 'ウマ娘 プリティーダービー',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
      {
        name: '1日の終わりに',
        title: 'ウマ娘 プリティーダービー',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
      {
        name: '開幕ッ！大農耕時代ッ！',
        title: 'ウマ娘 プリティーダービー',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
      {
        name: '合宿ッ！農家体験ッ！',
        title: 'ウマ娘 プリティーダービー',
        cardKindNormalized: 'evolve_spell',
        deckSection: 'evolve',
      },
    ],
  },
];

export const cardMatchesFieldLinkMember = (
  card: Pick<DeckBuilderCardData, 'name' | 'title' | 'card_kind_normalized' | 'deck_section'> | null | undefined,
  member: FieldLinkRuleMember
): boolean => (
  Boolean(card)
  && card?.name === member.name
  && (card?.title ?? '') === member.title
  && (card?.card_kind_normalized ?? '') === member.cardKindNormalized
  && (card?.deck_section ?? '') === member.deckSection
);

export const getFieldLinkGroupId = (
  card: Pick<DeckBuilderCardData, 'name' | 'title' | 'card_kind_normalized' | 'deck_section'> | null | undefined
): string | null => {
  if (!card) return null;

  const matchingGroup = FIELD_LINK_RULE_GROUPS.find(group => (
    group.members.some(member => cardMatchesFieldLinkMember(card, member))
  ));

  return matchingGroup?.id ?? null;
};
