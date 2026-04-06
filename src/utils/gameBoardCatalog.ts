import { getFieldLinkGroupId } from '../data/fieldLinkRules';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { buildCardDetailLookup, type CardDetailLookup } from './cardDetails';
import { buildCardStatLookup, type CardStatLookup } from './cardStats';
import { buildEvolveAutoAttachResolver, type EvolveAutoAttachResolver } from './evolveAutoAttach';
import { buildFieldLinkAutoAttachResolver, type FieldLinkAutoAttachResolver } from './fieldLinkAutoAttach';

export type GameBoardCatalogResources = {
  catalogById: Record<string, DeckBuilderCardData>;
  statLookup: CardStatLookup;
  detailLookup: CardDetailLookup;
  evolveAutoAttachResolver: EvolveAutoAttachResolver;
  fieldLinkAutoAttachResolver: FieldLinkAutoAttachResolver;
  fieldLinkCardIds: Set<string>;
  tokenEquipmentCardIds: Set<string>;
};

export const buildGameBoardCatalogResources = (
  data: DeckBuilderCardData[]
): GameBoardCatalogResources => {
  const catalogById = data.reduce<Record<string, DeckBuilderCardData>>((lookup, card) => {
    lookup[card.id] = card;
    return lookup;
  }, {});

  return {
    catalogById,
    statLookup: buildCardStatLookup(data),
    detailLookup: buildCardDetailLookup(data),
    evolveAutoAttachResolver: buildEvolveAutoAttachResolver(data),
    fieldLinkAutoAttachResolver: buildFieldLinkAutoAttachResolver(data),
    fieldLinkCardIds: new Set(
      data
        .filter((card) => Boolean(getFieldLinkGroupId(card)))
        .map((card) => card.id)
    ),
    tokenEquipmentCardIds: new Set(
      data
        .filter((card) => card.card_kind_normalized === 'token_equipment')
        .map((card) => card.id)
    ),
  };
};
