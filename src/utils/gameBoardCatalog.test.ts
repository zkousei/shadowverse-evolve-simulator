import { describe, expect, it } from 'vitest';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { buildGameBoardCatalogResources } from './gameBoardCatalog';

describe('buildGameBoardCatalogResources', () => {
  it('builds lookup tables and resolver inputs from card catalog data', () => {
    const cards = [
      {
        id: 'main-follower',
        name: 'Main Follower',
        title: 'Test Title',
        image: '/main.png',
        deck_section: 'main',
        card_kind_normalized: 'follower',
        card_type: 'Follower',
        atk: '3',
        hp: '2',
      },
      {
        id: 'evolve-source',
        name: 'Evolve Source',
        title: 'Test Title',
        image: '/evolve.png',
        deck_section: 'evolve',
        card_kind_normalized: 'follower',
        card_type: 'Follower',
        evolves_from: ['main-follower'],
      },
      {
        id: 'field-link',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        image: '/field-link.png',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
        card_type: 'Spell',
      },
      {
        id: 'token-equipment',
        name: 'Token Equipment',
        title: 'Test Title',
        image: '/token-equipment.png',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
        card_type: 'Amulet',
      },
    ] as DeckBuilderCardData[];

    const resources = buildGameBoardCatalogResources(cards);

    expect(resources.catalogById['main-follower']?.name).toBe('Main Follower');
    expect(resources.statLookup['main-follower']).toMatchObject({ atk: 3, hp: 2 });
    expect(resources.detailLookup['main-follower']?.image).toBe('/main.png');
    expect(resources.evolveAutoAttachResolver).not.toBeNull();
    expect(resources.fieldLinkAutoAttachResolver).not.toBeNull();
    expect(resources.fieldLinkCardIds.has('field-link')).toBe(true);
    expect(resources.tokenEquipmentCardIds.has('token-equipment')).toBe(true);
  });
});
