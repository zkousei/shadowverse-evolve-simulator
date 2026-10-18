import { getFieldLinkGroupId } from './fieldLinkRules';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { buildCardDetailLookup, type CardDetailLookup } from '../card/cardDetails';
import { buildCardStatLookup, type CardStatLookup } from '../card/cardStats';
import { buildEvolveAutoAttachResolver, type EvolveAutoAttachResolver } from './evolveAutoAttach';
import { buildFieldLinkAutoAttachResolver, type FieldLinkAutoAttachResolver } from './fieldLinkAutoAttach';
import type { GameBoardCatalogRuleCard } from './gameBoardCatalogTypes';

export type GameBoardCatalogMetadata = {
  statLookup: CardStatLookup;
  evolveAutoAttachResolver: EvolveAutoAttachResolver;
  fieldLinkAutoAttachResolver: FieldLinkAutoAttachResolver;
  fieldLinkCardIds: Set<string>;
  tokenManualLinkCardIds: Set<string>;
};

export type GameBoardCatalogResources = GameBoardCatalogMetadata & {
  catalogById: Record<string, DeckBuilderCardData>;
  detailLookup: CardDetailLookup;
};

const TOKEN_MANUAL_LINK_CARD_KINDS = new Set(['token_equipment', 'token_treasure']);

/** Use the entire index so off-deck family and link metadata remains available. */
export const buildGameBoardCatalogMetadata = (
  data: readonly GameBoardCatalogRuleCard[]
): GameBoardCatalogMetadata => ({
  statLookup: buildCardStatLookup(data),
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
});

export const buildGameBoardCatalogResources = (
  data: DeckBuilderCardData[]
): GameBoardCatalogResources => {
  const catalogById = data.reduce<Record<string, DeckBuilderCardData>>((lookup, card) => {
    lookup[card.id] = card;
    return lookup;
  }, {});

  return {
    ...buildGameBoardCatalogMetadata(data),
    catalogById,
    detailLookup: buildCardDetailLookup(data),
  };
};
