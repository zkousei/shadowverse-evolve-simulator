import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { buildEvolveAutoAttachResolver } from './evolveAutoAttach';

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

describe('buildEvolveAutoAttachResolver', () => {
  it('resolves direct evolve_follower matches by exact related id', () => {
    const resolver = buildEvolveAutoAttachResolver([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'evo-runtime',
        cardId: 'EVO-001',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [
        createRuntimeCard({ id: 'field-base', cardId: 'BASE-001', name: 'Base Follower' }),
      ]
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      matchSource: 'direct',
      card: { id: 'field-base' },
    });
  });

  it('includes reprint targets that share the same name/title/kind family', () => {
    const resolver = buildEvolveAutoAttachResolver([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({ id: 'BASE-SP', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
      createCatalogCard({
        id: 'EVO-SP',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-SP', name: 'Base Follower' }],
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'evo-runtime',
        cardId: 'EVO-001',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [
        createRuntimeCard({ id: 'field-base-1', cardId: 'BASE-001', name: 'Base Follower' }),
        createRuntimeCard({ id: 'field-base-2', cardId: 'BASE-SP', name: 'Base Follower' }),
      ]
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map(candidate => [candidate.card.id, candidate.matchSource])).toEqual([
      ['field-base-1', 'direct'],
      ['field-base-2', 'reprint'],
    ]);
  });

  it('supports evolve_amulet cards that stack onto a related main card', () => {
    const resolver = buildEvolveAutoAttachResolver([
      createCatalogCard({ id: 'BASE-001', name: 'Target Follower' }),
      createCatalogCard({
        id: 'EVO-AMULET-001',
        name: 'Target Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_amulet',
        related_cards: [{ id: 'BASE-001', name: 'Target Follower' }],
      }),
    ]);

    const candidates = resolver.resolveCandidates(
      createRuntimeCard({
        id: 'evolve-amulet-runtime',
        cardId: 'EVO-AMULET-001',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      [createRuntimeCard({ id: 'field-base', cardId: 'BASE-001', name: 'Target Follower' })]
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].card.id).toBe('field-base');
  });

  it('ignores unsupported evolve sources and invalid field targets', () => {
    const resolver = buildEvolveAutoAttachResolver([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'ADVANCE-001',
        name: 'Advance Card',
        deck_section: 'evolve',
        card_kind_normalized: 'advance_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
      createCatalogCard({
        id: 'SPELL-001',
        name: 'Special Spell',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    const boardCards = [
      createRuntimeCard({ id: 'field-base', cardId: 'BASE-001', name: 'Base Follower' }),
      createRuntimeCard({
        id: 'field-token',
        cardId: 'BASE-001',
        name: 'Token Copy',
        isTokenCard: true,
      }),
    ];

    expect(resolver.resolveCandidates(
      createRuntimeCard({
        id: 'advance-runtime',
        cardId: 'ADVANCE-001',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      boardCards
    )).toEqual([]);

    expect(resolver.resolveCandidates(
      createRuntimeCard({
        id: 'spell-runtime',
        cardId: 'SPELL-001',
        zone: 'evolveDeck-host',
        owner: 'host',
        isEvolveCard: true,
      }),
      boardCards
    )).toEqual([]);
  });
});
