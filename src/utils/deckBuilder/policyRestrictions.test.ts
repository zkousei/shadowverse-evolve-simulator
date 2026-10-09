import { describe, expect, it } from 'vitest';
import { getPolicyRestrictionForCard } from '../../data/policyRestrictions';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { createDefaultDeckRuleConfig } from '../../models/deckRule';
import { getEffectiveDeckRestriction } from '../deck/deckRestrictionRules';

const createCard = (
  name: string,
  cardClass: DeckBuilderCardData['class'],
  type: string,
  deckSection: 'main' | 'evolve'
): DeckBuilderCardData => ({
  id: 'TEST-001',
  name,
  image: '/test.png',
  class: cardClass,
  type,
  deck_section: deckSection,
});

describe('清浄の領域 policy restrictions', () => {
  it.each(['constructed', 'crossover'] as const)('limits 清浄の領域 to one copy in %s', format => {
    const card = createCard('清浄の領域', 'ビショップ', 'アミュレット', 'main');

    expect(getPolicyRestrictionForCard(card, format)?.status).toBe('limited');
    expect(getEffectiveDeckRestriction(card, 'main', {
      ...createDefaultDeckRuleConfig(),
      format,
    })).toMatchObject({ copyLimit: 1, source: 'policy-limited', format });
  });
});

describe('constructed policy restrictions', () => {
  it('applies the current bans and limits to the intended card faces', () => {
    const octrice = createCard('簒奪の絶傑・オクトリス', 'ロイヤル', 'フォロワー', 'main');
    const evolvedOctrice = createCard('簒奪の絶傑・オクトリス', 'ロイヤル', 'フォロワー・エボルヴ', 'evolve');
    const worshipper = createCard('烈絶の崇拝者', 'ドラゴン', 'フォロワー', 'main');

    expect(getPolicyRestrictionForCard(octrice, 'constructed')?.status).toBe('banned');
    expect(getPolicyRestrictionForCard(evolvedOctrice, 'constructed')).toBeUndefined();
    expect(getPolicyRestrictionForCard(worshipper, 'constructed')?.status).toBe('limited');
  });

  it.each([
    ['お菓子の家', 'ウィッチ', 'アミュレット'],
    ['紫紺の抵抗者・エンネア', 'ナイトメア', 'フォロワー'],
    ['マンハッタンカフェ', 'ナイトメア', 'フォロワー'],
  ] as const)('does not restrict %s after its restriction is lifted', (name, cardClass, type) => {
    expect(getPolicyRestrictionForCard(
      createCard(name, cardClass, type, 'main'),
      'constructed'
    )).toBeUndefined();
  });
});

describe('crossover policy restrictions', () => {
  it('bans Tin Soldier', () => {
    const tinSoldier = createCard('ブリキの兵隊', 'ビショップ', 'フォロワー', 'main');

    expect(getPolicyRestrictionForCard(tinSoldier, 'crossover')?.status).toBe('banned');
  });
});
