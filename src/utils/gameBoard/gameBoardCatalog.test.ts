import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import type { CardInstance } from '../../components/Card';
import { buildGameBoardCatalogMetadata, buildGameBoardCatalogResources } from './gameBoardCatalog';
import type { GeneratedCardIndexEntry } from '../card/generatedCardCatalog';
import { resolveSelectedCardFaceDetail } from '../card/cardDetails';

const catalogCard = (id: string, patch: Partial<DeckBuilderCardData> = {}): DeckBuilderCardData => ({
  id, name: id, image: `/${id}.png`, title: 'Test Title',
  deck_section: 'main', card_kind_normalized: 'follower', ...patch,
});
const runtimeCard = (card: DeckBuilderCardData, zone = 'field-host'): CardInstance => ({
  id: `${card.id}-instance`, cardId: card.id, name: card.name, image: card.image,
  owner: 'host', zone, isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 },
  isEvolveCard: card.deck_section === 'evolve',
});

describe.each([
  { label: 'full catalog resources', build: buildGameBoardCatalogResources },
  { label: 'catalog metadata', build: buildGameBoardCatalogMetadata },
])('$label candidate contracts', ({ build }) => {
  it('uses an off-deck evolve family member to resolve a source without its own related IDs', () => {
    const base = catalogCard('BASE', { name: 'Knight' });
    const source = catalogCard('EVO-REPRINT', {
      name: 'Knight', deck_section: 'evolve', card_kind_normalized: 'evolve_follower',
    });
    const familyMember = catalogCard('EVO-ORIGINAL', {
      ...source, id: 'EVO-ORIGINAL', related_cards: [{ id: base.id, name: base.name }],
    });
    const board = [runtimeCard(base)];
    const resources = build([base, source, familyMember]);
    expect(resources.evolveAutoAttachResolver.resolveCandidates(runtimeCard(source, 'evolveDeck-host'), board))
      .toEqual([{ card: board[0], matchSource: 'reprint' }]);
    // Loading only the runtime IDs loses the family information even though
    // both cards participating in the action are present.
    expect(build([base, source]).evolveAutoAttachResolver
      .resolveCandidates(runtimeCard(source, 'evolveDeck-host'), board)).toEqual([]);
  });

  it('does not infer a reprint target when an off-deck family member makes the family ambiguous', () => {
    const base = catalogCard('BASE', { name: 'Knight' });
    const reprint = catalogCard('BASE-REPRINT', { name: base.name });
    const other = catalogCard('OTHER', { name: 'Other Knight' });
    const source = catalogCard('EVO', {
      name: 'Evolved Knight', deck_section: 'evolve', card_kind_normalized: 'evolve_follower',
      related_cards: [{ id: base.id, name: base.name }],
    });
    const conflicting = catalogCard('EVO-OTHER', {
      ...source, id: 'EVO-OTHER', related_cards: [{ id: other.id, name: other.name }],
    });
    const board = [runtimeCard(base), runtimeCard(reprint)];
    const resolve = (cards: DeckBuilderCardData[]) => build(cards)
      .evolveAutoAttachResolver.resolveCandidates(runtimeCard(source, 'evolveDeck-host'), board);
    expect(resolve([base, reprint, other, source, conflicting]))
      .toEqual([{ card: board[0], matchSource: 'direct' }]);
    expect(resolve([base, reprint, source])).toEqual([
      { card: board[0], matchSource: 'direct' }, { card: board[1], matchSource: 'reprint' },
    ]);
  });

  it('resolves field links through a different off-deck ID in the same rule group', () => {
    const linked = catalogCard('CARROT', {
      name: 'にんじん', title: 'ウマ娘 プリティーダービー',
      deck_section: 'evolve', card_kind_normalized: 'evolve_spell',
    });
    const source = catalogCard('SUCCESS', { ...linked, id: 'SUCCESS', name: '開催大成功！' });
    const base = catalogCard('RUNNER', { related_cards: [{ id: linked.id, name: linked.name }] });
    const board = [runtimeCard(base)];
    const resources = build([base, source, linked]);
    expect(resources.fieldLinkAutoAttachResolver.resolveCandidates(runtimeCard(source, 'evolveDeck-host'), board))
      .toEqual(board);
    expect(build([base, source]).fieldLinkAutoAttachResolver
      .resolveCandidates(runtimeCard(source, 'evolveDeck-host'), board)).toEqual([]);
  });
});

describe('buildGameBoardCatalogResources', () => {
  it('keeps complete ability text and selected-face stats separate from front-side base stats', () => {
    const card = catalogCard('DOUBLE', {
      atk: '2', hp: '3', ability_text: 'Front ability',
      faces: [
        { side: 'front', name: 'Front', image: '/front.png', atk: '2', hp: '3', ability_text: 'Front ability' },
        { side: 'back', name: 'Back', image: '/back.png', atk: '7', hp: '8', ability_text: 'Back ability' },
      ],
    });
    const resources = buildGameBoardCatalogResources([card]);
    expect(resources.statLookup.DOUBLE).toEqual({ atk: 2, hp: 3 });
    expect(resources.detailLookup.DOUBLE.abilityText).toBe('Front ability');
    expect(resolveSelectedCardFaceDetail(resources.detailLookup.DOUBLE, 'back')).toMatchObject({
      name: 'Back', image: '/back.png', atk: 7, hp: 8, abilityText: 'Back ability',
    });
    expect(resources.detailLookup.DOUBLE.faces).toHaveLength(2);
    expect(resources.catalogById.DOUBLE).toEqual(card);
  });

  it('builds lookup tables and resolver inputs from card catalog data', () => {
    const cards: DeckBuilderCardData[] = [
      {
        id: 'main-follower',
        name: 'Main Follower',
        title: 'Test Title',
        image: '/main.png',
        deck_section: 'main',
        card_kind_normalized: 'follower',
        type: 'Follower',
        atk: '3',
        hp: '2',
      },
      {
        id: 'evolve-source',
        name: 'Evolve Source',
        title: 'Test Title',
        image: '/evolve.png',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        type: 'Follower',
        related_cards: [{ id: 'main-follower', name: 'Main Follower' }],
      },
      {
        id: 'field-link',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        image: '/field-link.png',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
        type: 'Spell',
      },
      {
        id: 'token-equipment',
        name: 'Token Equipment',
        title: 'Test Title',
        image: '/token-equipment.png',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
        type: 'Amulet',
      },
      {
        id: 'token-treasure',
        name: 'Token Treasure',
        title: 'Test Title',
        image: '/token-treasure.png',
        deck_section: 'token',
        card_kind_normalized: 'token_treasure',
        type: 'Treasure',
      },
      {
        id: 'crest-token',
        name: 'Crest Token',
        title: 'Test Title',
        image: '/crest.png',
        deck_section: 'token',
        card_kind_normalized: 'token_crest',
        type: 'クレスト・トークン',
      },
      {
        id: 'preview-follower',
        name: 'Preview Follower',
        title: 'Preview Title',
        image: '',
        deck_section: 'main',
        card_kind_normalized: 'follower',
        type: 'Follower',
        atk: '4',
        hp: '5',
        catalog_status: 'preview',
      },
    ];

    const resources = buildGameBoardCatalogResources(cards);

    expect(resources.catalogById['main-follower']?.name).toBe('Main Follower');
    expect(resources.statLookup['main-follower']).toMatchObject({ atk: 3, hp: 2 });
    expect(resources.detailLookup['main-follower']?.image).toBe('/main.png');
    expect(resources.evolveAutoAttachResolver).not.toBeNull();
    expect(resources.fieldLinkAutoAttachResolver).not.toBeNull();
    expect(resources.fieldLinkCardIds.has('field-link')).toBe(true);
    expect(resources.tokenManualLinkCardIds.has('token-equipment')).toBe(true);
    expect(resources.tokenManualLinkCardIds.has('token-treasure')).toBe(true);
    expect(resources.tokenManualLinkCardIds.has('crest-token')).toBe(false);
    expect(resources.catalogById['preview-follower']?.catalog_status).toBe('preview');
    expect(resources.statLookup['preview-follower']).toMatchObject({ atk: 4, hp: 5 });
    expect(resources.detailLookup['preview-follower']?.image).toBe('');
  });
});

describe('buildGameBoardCatalogMetadata', () => {
  it('accepts a frozen generated index and exposes rules without manufacturing complete details', () => {
    const related = Object.freeze([Object.freeze({ id: 'TOKEN', name: 'Token' })]);
    const index: readonly GeneratedCardIndexEntry[] = Object.freeze([
      Object.freeze({ id: 'MAIN', name: 'Main', detail_group: 'MAIN', atk: '2', hp: '3', related_cards: related }),
      Object.freeze({ id: 'TOKEN', name: 'Token', detail_group: 'TOKEN', deck_section: 'token' as const,
        card_kind_normalized: 'token_equipment' as const }),
      Object.freeze({ id: 'TREASURE', name: 'Treasure', detail_group: 'TREASURE',
        card_kind_normalized: 'token_treasure' as const }),
      Object.freeze({ id: 'CREST', name: 'Crest', detail_group: 'CREST',
        card_kind_normalized: 'token_crest' as const }),
    ]);
    const metadata = buildGameBoardCatalogMetadata(index);
    expect(metadata.statLookup).toEqual({ MAIN: { atk: 2, hp: 3 } });
    expect(metadata.tokenManualLinkCardIds).toEqual(new Set(['TOKEN', 'TREASURE']));
    expect(metadata.fieldLinkCardIds).toEqual(new Set());
    expect(metadata).not.toHaveProperty('detailLookup');
    expect(metadata).not.toHaveProperty('catalogById');
    expect(index[0].related_cards).toEqual([{ id: 'TOKEN', name: 'Token' }]);
    expect(index.every(card => !('ability_text' in card) && !('faces' in card))).toBe(true);
  });
});
