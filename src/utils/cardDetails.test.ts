import { describe, expect, it } from 'vitest';
import { buildCardDetailLookup, buildCardDetailPresentation, formatAbilityText } from './cardDetails';

describe('cardDetails', () => {
  it('builds a lookup with parsed stats and text fields', () => {
    const cardWithRelatedCards = {
      id: 'BP01-001',
      name: 'Test Follower',
      image: '/test.png',
      class: 'ロイヤル',
      title: 'Sample',
      type: 'フォロワー',
      subtype: '兵士',
      card_kind_normalized: 'advance_follower',
      cost: '3',
      atk: '2',
      hp: '4',
      ability_text: 'Alpha',
      related_cards: [{ id: 'TK01-001', name: 'Token' }],
    };

    const lookup = buildCardDetailLookup([
      cardWithRelatedCards,
      {
        id: 'BP01-002',
        atk: '-',
        hp: '',
      },
    ]);

    expect(lookup['BP01-001']).toEqual({
      id: 'BP01-001',
      name: 'Test Follower',
      image: '/test.png',
      className: 'ロイヤル',
      title: 'Sample',
      type: 'フォロワー',
      subtype: '兵士',
      cardKindNormalized: 'advance_follower',
      cost: '3',
      atk: 2,
      hp: 4,
      abilityText: 'Alpha',
    });
    expect(lookup['BP01-002'].atk).toBeNull();
    expect(lookup['BP01-002'].hp).toBeNull();
    expect(lookup['BP01-001']).not.toHaveProperty('related_cards');
  });

  it('formats separators in ability text for readability', () => {
    expect(formatAbilityText('A ---------- B ――――――――――――――― C')).toBe(
      'A\n\n----------\n\nB\n\n―――――――――――――――\n\nC'
    );
  });

  it('builds presentation metadata and stats from card details', () => {
    expect(buildCardDetailPresentation({
      className: 'Royal',
      title: 'Hero Tale',
      type: 'Follower',
      subtype: 'Soldier',
      atk: 2,
      hp: 4,
    })).toEqual({
      primaryMeta: 'Royal / Hero Tale',
      secondaryMeta: 'Follower / Soldier',
      stats: '2 / 4',
    });

    expect(buildCardDetailPresentation({
      className: '',
      title: 'Hero Tale',
      type: 'Follower',
      subtype: '',
      atk: 2,
      hp: null,
    })).toEqual({
      primaryMeta: 'Hero Tale',
      secondaryMeta: 'Follower',
      stats: null,
    });

    expect(buildCardDetailPresentation(null)).toEqual({
      primaryMeta: '',
      secondaryMeta: '',
      stats: null,
    });
  });
});
