import { getFieldLinkGroupId } from '../../data/fieldLinkRules';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { buildCardDetailLookup, type CardDetailLookup } from '../card/cardDetails';
import { buildCardStatLookup, type CardStatLookup } from '../card/cardStats';
import { buildEvolveAutoAttachResolver, type EvolveAutoAttachResolver } from './evolveAutoAttach';
import { buildFieldLinkAutoAttachResolver, type FieldLinkAutoAttachResolver } from './fieldLinkAutoAttach';

export type GameBoardCatalogResources = {
  catalogById: Record<string, DeckBuilderCardData>;
  statLookup: CardStatLookup;
  detailLookup: CardDetailLookup;
  evolveAutoAttachResolver: EvolveAutoAttachResolver;
  fieldLinkAutoAttachResolver: FieldLinkAutoAttachResolver;
  fieldLinkCardIds: Set<string>;
  tokenManualLinkCardIds: Set<string>;
};

const TOKEN_MANUAL_LINK_CARD_KINDS = new Set(['token_equipment', 'token_treasure']);

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
    tokenManualLinkCardIds: new Set(
      data
        .filter((card) => TOKEN_MANUAL_LINK_CARD_KINDS.has(card.card_kind_normalized ?? ''))
        .map((card) => card.id)
    ),
  };
};
