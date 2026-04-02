import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { buildFieldLinkAutoAttachResolver } from './fieldLinkAutoAttach';

const createCatalogCard = (overrides: Partial<DeckBuilderCardData>): DeckBuilderCardData => ({
  id: 'CARD-001',
  name: 'Test Card',
  image: '/card.png',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  ...overrides,
});

const createRuntimeCard = (overrides: Partial<CardInstance>): CardInstance => ({
  id: 'runtime-1',
  cardId: 'CARD-001',
  name: 'Runtime Card',
  image: '/runtime.png',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  genericCounter: 0,
  ...overrides,
});

describe('buildFieldLinkAutoAttachResolver', () => {
  it('resolves drive point targets by reverse related_cards lookup', () => {
    const resolver = buildFieldLinkAutoAttachResolver([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'drive-runtime',
        cardId: 'DRIVE-001',
        name: 'ドライブポイント',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [
        createRuntimeCard({ id: 'field-base', cardId: 'BASE-001', name: 'Base Vanguard Unit' }),
      ]
    );

    expect(candidates.map(card => card.id)).toEqual(['field-base']);
  });

  it('accepts carrot-like reprints through the shared link group', () => {
    const resolver = buildFieldLinkAutoAttachResolver([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Uma Target',
        title: 'ウマ娘 プリティーダービー',
        related_cards: [{ id: 'CARROT-001', name: 'にんじん' }],
      }),
      createCatalogCard({
        id: 'CARROT-001',
        name: 'にんじん',
        title: 'ウマ娘 プリティーダービー',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
      createCatalogCard({
        id: 'CARROT-SP',
        name: '開催大成功！',
        title: 'ウマ娘 プリティーダービー',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'carrot-runtime',
        cardId: 'CARROT-SP',
        name: '開催大成功！',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [
        createRuntimeCard({
          id: 'field-base',
          cardId: 'BASE-001',
          name: 'Uma Target',
        }),
      ]
    );

    expect(candidates.map(card => card.id)).toEqual(['field-base']);
  });

  it('keeps evolved units eligible because linked cards sit under the whole unit', () => {
    const resolver = buildFieldLinkAutoAttachResolver([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Vanguard Unit',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Vanguard Unit' }],
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'drive-runtime',
        cardId: 'DRIVE-001',
        name: 'ドライブポイント',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [
        createRuntimeCard({ id: 'field-base', cardId: 'BASE-001', name: 'Base Vanguard Unit' }),
        createRuntimeCard({
          id: 'field-evolved',
          cardId: 'EVO-001',
          name: 'Base Vanguard Unit',
          zone: 'field-host',
          owner: 'host',
          isEvolveCard: true,
          attachedTo: 'field-base',
        }),
      ]
    );

    expect(candidates.map(card => card.id)).toEqual(['field-base']);
  });

  it('ignores unrelated or invalid field targets', () => {
    const resolver = buildFieldLinkAutoAttachResolver([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'drive-runtime',
        cardId: 'DRIVE-001',
        name: 'ドライブポイント',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [
        createRuntimeCard({ id: 'field-base', cardId: 'BASE-001', name: 'Base Vanguard Unit' }),
        createRuntimeCard({ id: 'field-token', cardId: 'BASE-001', name: 'Token Copy', isTokenCard: true }),
      ]
    );

    expect(candidates).toEqual([]);
  });
});
