import { describe, expect, it } from 'vitest';
import type { CardInstance } from '../components/Card';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { findUnitRootCard, isEquipmentLinkTargetCard, isTokenEquipmentCard } from './gameBoardManualLink';

const buildCard = (overrides: Partial<CardInstance> = {}): CardInstance => ({
  id: 'card-1',
  cardId: 'CARD-1',
  name: 'Card',
  image: '',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

describe('gameBoardManualLink', () => {
  describe('findUnitRootCard', () => {
    it('walks attached and linked parent chains to the root card', () => {
      const root = buildCard({ id: 'root' });
      const middle = buildCard({ id: 'middle', attachedTo: 'root' });
      const leaf = buildCard({ id: 'leaf', linkedTo: 'middle' });

      expect(findUnitRootCard([root, middle, leaf], leaf)).toBe(root);
    });

    it('stops at the current card when the parent chain is missing or cyclic', () => {
      const orphan = buildCard({ id: 'orphan', attachedTo: 'missing' });
      const cycleA = buildCard({ id: 'cycle-a', attachedTo: 'cycle-b' });
      const cycleB = buildCard({ id: 'cycle-b', attachedTo: 'cycle-a' });

      expect(findUnitRootCard([orphan], orphan)).toBe(orphan);
      expect(findUnitRootCard([cycleA, cycleB], cycleA)).toBe(cycleB);
    });
  });

  describe('isTokenEquipmentCard', () => {
    it('accepts runtime token equipment cards and catalog-derived token equipment ids', () => {
      const catalogIds = new Set(['CATALOG-EQUIPMENT']);

      expect(isTokenEquipmentCard(buildCard({ cardKindNormalized: 'token_equipment' }), new Set())).toBe(true);
      expect(isTokenEquipmentCard(buildCard({ cardId: 'CATALOG-EQUIPMENT' }), catalogIds)).toBe(true);
      expect(isTokenEquipmentCard(buildCard({ cardId: 'OTHER' }), catalogIds)).toBe(false);
      expect(isTokenEquipmentCard(undefined, catalogIds)).toBe(false);
    });
  });

  describe('isEquipmentLinkTargetCard', () => {
    it('uses catalog data when available', () => {
      const runtimeSpell = buildCard({ baseCardType: 'spell' });
      const followerCatalog: DeckBuilderCardData = {
        id: 'CATALOG-FOLLOWER',
        name: 'Catalog Follower',
        image: '',
        deck_section: 'main',
        card_kind_normalized: 'follower',
      };
      const tokenCatalog: DeckBuilderCardData = {
        id: 'CATALOG-TOKEN',
        name: 'Catalog Token',
        image: '',
        deck_section: 'token',
        card_kind_normalized: 'follower',
      };

      expect(isEquipmentLinkTargetCard(runtimeSpell, followerCatalog)).toBe(true);
      expect(isEquipmentLinkTargetCard(runtimeSpell, tokenCatalog)).toBe(false);
    });

    it('falls back to runtime follower flags when catalog data is missing', () => {
      expect(isEquipmentLinkTargetCard(buildCard({ baseCardType: 'follower' }), undefined)).toBe(true);
      expect(isEquipmentLinkTargetCard(buildCard({ baseCardType: 'spell' }), undefined)).toBe(false);
      expect(isEquipmentLinkTargetCard(buildCard({ baseCardType: 'follower', isLeaderCard: true }), undefined)).toBe(false);
      expect(isEquipmentLinkTargetCard(buildCard({ baseCardType: 'follower', isEvolveCard: true }), undefined)).toBe(false);
      expect(isEquipmentLinkTargetCard(buildCard({ baseCardType: 'follower', isTokenCard: true }), undefined)).toBe(false);
      expect(isEquipmentLinkTargetCard(undefined, undefined)).toBe(false);
    });
  });
});
