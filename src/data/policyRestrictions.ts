import { getDisplayDedupKey, type DeckBuilderCardData } from '../models/deckBuilderCard';
import type { PolicyRestriction, RestrictionFormat } from '../models/deckRestriction';

const createPolicyRestrictionKey = (
  name: string,
  deckSection: 'main' | 'evolve',
  type: string,
  cardClass: string
): string => [name, deckSection, type, cardClass].join('::');

const createPolicyRestriction = (
  format: RestrictionFormat,
  status: PolicyRestriction['status'],
  name: string,
  deckSection: 'main' | 'evolve',
  type: string,
  cardClass: string,
  reason: string
): PolicyRestriction => ({
  format,
  status,
  key: createPolicyRestrictionKey(name, deckSection, type, cardClass),
  reason,
});

export const POLICY_RESTRICTIONS: PolicyRestriction[] = [
  createPolicyRestriction('constructed', 'banned', 'ワールドブレイク', 'main', 'スペル', 'ニュートラル', 'Banned in constructed.'),
  createPolicyRestriction('constructed', 'banned', '運命への反逆', 'main', 'スペル', 'ウィッチ', 'Banned in constructed.'),
  createPolicyRestriction('constructed', 'banned', '星の鎧', 'main', 'スペル', 'ロイヤル', 'Banned in constructed.'),
  createPolicyRestriction('constructed', 'banned', 'スターダスト・トランペッター', 'main', 'アミュレット', 'ロイヤル', 'Banned in constructed.'),
  createPolicyRestriction('constructed', 'banned', 'リザードランナー アンドゥー', 'main', 'アミュレット', 'ドラゴン', 'Banned in constructed.'),
  createPolicyRestriction('constructed', 'limited', '竜巫女の儀式', 'main', 'アミュレット', 'ドラゴン', 'Limited to 1 copy in constructed.'),
  createPolicyRestriction('constructed', 'limited', '紫紺の抵抗者・エンネア', 'main', 'フォロワー', 'ナイトメア', 'Limited to 1 copy in constructed.'),
  createPolicyRestriction('constructed', 'limited', 'マンハッタンカフェ', 'main', 'フォロワー', 'ナイトメア', 'Limited to 1 copy in constructed.'),
  createPolicyRestriction('constructed', 'limited', 'お菓子の家', 'main', 'アミュレット', 'ウィッチ', 'Limited to 1 copy in constructed.'),
  createPolicyRestriction('crossover', 'banned', '運命への反逆', 'main', 'スペル', 'ウィッチ', 'Banned in crossover.'),
  createPolicyRestriction('crossover', 'limited', '天下の大泥棒・ジエモン', 'main', 'フォロワー', 'ロイヤル', 'Limited to 1 main-deck copy in crossover.'),
  createPolicyRestriction('crossover', 'limited', 'ブリキの兵隊', 'main', 'フォロワー', 'ビショップ', 'Limited to 1 copy in crossover.'),
];

const POLICY_RESTRICTION_BY_FORMAT_AND_KEY = new Map(
  POLICY_RESTRICTIONS.map(restriction => [`${restriction.format}::${restriction.key}`, restriction])
);

export const getPolicyRestrictionForCard = (
  card: DeckBuilderCardData,
  format: RestrictionFormat
): PolicyRestriction | undefined => POLICY_RESTRICTION_BY_FORMAT_AND_KEY.get(`${format}::${getDisplayDedupKey(card)}`);
