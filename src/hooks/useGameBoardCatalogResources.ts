import React from 'react';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import { loadCardCatalog } from '../utils/cardCatalog';
import { buildGameBoardCatalogResources } from '../utils/gameBoardCatalog';
import type { CardStatLookup } from '../utils/cardStats';
import type { CardDetailLookup } from '../utils/cardDetails';
import type { EvolveAutoAttachResolver } from '../utils/evolveAutoAttach';
import type { FieldLinkAutoAttachResolver } from '../utils/fieldLinkAutoAttach';

export const useGameBoardCatalogResources = () => {
  const [cardStatLookup, setCardStatLookup] = React.useState<CardStatLookup>({});
  const [cardDetailLookup, setCardDetailLookup] = React.useState<CardDetailLookup>({});
  const cardDetailLookupRef = React.useRef<CardDetailLookup>({});
  const cardCatalogByIdRef = React.useRef<Record<string, DeckBuilderCardData>>({});
  const evolveAutoAttachResolverRef = React.useRef<EvolveAutoAttachResolver | null>(null);
  const fieldLinkAutoAttachResolverRef = React.useRef<FieldLinkAutoAttachResolver | null>(null);
  const fieldLinkCardIdsRef = React.useRef<Set<string>>(new Set());
  const tokenEquipmentCardIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let isActive = true;

    loadCardCatalog()
      .then((data: DeckBuilderCardData[]) => {
        if (!isActive) return;

        const resources = buildGameBoardCatalogResources(data);
        cardCatalogByIdRef.current = resources.catalogById;
        console.log(
          '[DEBUG] Card lookups built:',
          Object.keys(resources.statLookup).length,
          'stats,',
          Object.keys(resources.detailLookup).length,
          'details'
        );
        setCardStatLookup(resources.statLookup);
        setCardDetailLookup(resources.detailLookup);
        cardDetailLookupRef.current = resources.detailLookup;
        evolveAutoAttachResolverRef.current = resources.evolveAutoAttachResolver;
        fieldLinkAutoAttachResolverRef.current = resources.fieldLinkAutoAttachResolver;
        fieldLinkCardIdsRef.current = resources.fieldLinkCardIds;
        tokenEquipmentCardIdsRef.current = resources.tokenEquipmentCardIds;
      })
      .catch(err => console.error('Could not load card stats', err));

    return () => {
      isActive = false;
      cardCatalogByIdRef.current = {};
      evolveAutoAttachResolverRef.current = null;
      fieldLinkAutoAttachResolverRef.current = null;
      fieldLinkCardIdsRef.current = new Set();
      tokenEquipmentCardIdsRef.current = new Set();
    };
  }, []);

  return {
    cardStatLookup,
    cardDetailLookup,
    cardDetailLookupRef,
    cardCatalogByIdRef,
    evolveAutoAttachResolverRef,
    fieldLinkAutoAttachResolverRef,
    fieldLinkCardIdsRef,
    tokenEquipmentCardIdsRef,
  };
};
