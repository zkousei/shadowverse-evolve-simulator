import { describe, expect, it } from 'vitest';
import { buildCardDetailLookup, buildCardDetailPresentation, formatAbilityText, resolveCardDisplayName, resolveSelectedCardFaceDetail } from './cardDetails';

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
      faces: [
        {
          side: 'front',
          name: 'Front Face',
          image: '/front.png',
          class: 'ロイヤル',
          title: 'Front Title',
          type: 'フォロワー・エボルヴ',
          subtype: '兵士',
          card_kind_normalized: 'evolve_follower',
          cost: '3',
          atk: '2',
          hp: '4',
          ability_text: 'Front ability',
        },
        {
          side: 'back',
          name: 'Back Face',
          image: '/back.png',
          class: 'ロイヤル',
          type: 'フォロワー・エボルヴ',
          subtype: '指揮官',
          card_kind_normalized: 'evolve_follower',
          cost: '-',
          atk: '5',
          hp: '6',
          ability_text: 'Back ability',
        },
      ],
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
      faces: [
        {
          side: 'front',
          name: 'Front Face',
          image: '/front.png',
          className: 'ロイヤル',
          title: 'Front Title',
          type: 'フォロワー・エボルヴ',
          subtype: '兵士',
          cardKindNormalized: 'evolve_follower',
          cost: '3',
          atk: 2,
          hp: 4,
          abilityText: 'Front ability',
        },
        {
          side: 'back',
          name: 'Back Face',
          image: '/back.png',
          className: 'ロイヤル',
          title: '',
          type: 'フォロワー・エボルヴ',
          subtype: '指揮官',
          cardKindNormalized: 'evolve_follower',
          cost: '-',
          atk: 5,
          hp: 6,
          abilityText: 'Back ability',
        },
      ],
    });
    expect(lookup['BP01-002'].atk).toBeNull();
    expect(lookup['BP01-002'].hp).toBeNull();
    expect(lookup['BP01-001']).not.toHaveProperty('related_cards');
  });

  it('resolves selected double-faced card details without mutating the base detail', () => {
    const detail = buildCardDetailLookup([
      {
        id: 'BP01-001',
        name: 'Front Base',
        image: '/base.png',
        type: 'フォロワー・エボルヴ',
        atk: '2',
        hp: '4',
        faces: [
          {
            side: 'front',
            name: 'Front Face',
            image: '/front.png',
            type: 'フォロワー・エボルヴ',
            atk: '2',
            hp: '4',
            ability_text: 'Front ability',
          },
          {
            side: 'back',
            name: 'Back Face',
            image: '/back.png',
            type: 'フォロワー・エボルヴ',
            atk: '5',
            hp: '6',
            ability_text: 'Back ability',
          },
        ],
      },
    ])['BP01-001'];

    const resolved = resolveSelectedCardFaceDetail(detail, 'back');

    expect(resolved).toMatchObject({
      id: 'BP01-001',
      name: 'Back Face',
      image: '/back.png',
      atk: 5,
      hp: 6,
      abilityText: 'Back ability',
    });
    expect(detail.name).toBe('Front Base');
    expect(resolveSelectedCardFaceDetail(detail, undefined)).toBe(detail);
    expect(resolveSelectedCardFaceDetail(detail, 'unknown')).toBe(detail);
  });

  it('resolves a card display name from the selected face', () => {
    const lookup = buildCardDetailLookup([
      {
        id: 'BP01-001',
        name: 'Front Base',
        faces: [
          { side: 'front', name: 'Front Face' },
          { side: 'back', name: 'Back Face' },
        ],
      },
    ]);

    expect(resolveCardDisplayName({
      cardId: 'BP01-001',
      name: 'Front Base',
      selectedFaceSide: 'back',
    }, lookup)).toBe('Back Face');
    expect(resolveCardDisplayName({
      cardId: 'BP01-001',
      name: 'Front Base',
    }, lookup)).toBe('Front Base');
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
