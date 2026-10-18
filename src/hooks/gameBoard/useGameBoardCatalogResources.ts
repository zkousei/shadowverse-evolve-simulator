import React from 'react';
import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { loadCardCatalog } from '../../utils/card/cardCatalog';
import { buildGameBoardCatalogResources } from '../../utils/gameBoard/gameBoardCatalog';
import type { CardStatLookup } from '../../utils/card/cardStats';
import type { CardDetailLookup } from '../../utils/card/cardDetails';
import type { EvolveAutoAttachResolver } from '../../utils/gameBoard/evolveAutoAttach';
import type { FieldLinkAutoAttachResolver } from '../../utils/gameBoard/fieldLinkAutoAttach';

export type GameBoardCatalogStatus = 'loading' | 'ready' | 'error';

export const useGameBoardCatalogResources = () => {
  const [catalogStatus, setCatalogStatus] = React.useState<GameBoardCatalogStatus>('loading');
  const [catalogCards, setCatalogCards] = React.useState<DeckBuilderCardData[]>([]);
  const [attempt, setAttempt] = React.useState(0);
  const retryQueued = React.useRef(false);
  const retryCatalog = React.useCallback(() => {
    if (catalogStatus !== 'error' || retryQueued.current) return;
    retryQueued.current = true;
    setCatalogStatus('loading');
    setAttempt(value => value + 1);
  }, [catalogStatus]);
  const [cardStatLookup, setCardStatLookup] = React.useState<CardStatLookup>({});
  const [cardDetailLookup, setCardDetailLookup] = React.useState<CardDetailLookup>({});
  const cardDetailLookupRef = React.useRef<CardDetailLookup>({});
  const cardCatalogByIdRef = React.useRef<Record<string, DeckBuilderCardData>>({});
  const evolveAutoAttachResolverRef = React.useRef<EvolveAutoAttachResolver | null>(null);
  const fieldLinkAutoAttachResolverRef = React.useRef<FieldLinkAutoAttachResolver | null>(null);
  const fieldLinkCardIdsRef = React.useRef<Set<string>>(new Set());
  const tokenManualLinkCardIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let isActive = true;

    loadCardCatalog()
      .then((data: DeckBuilderCardData[]) => {
        if (!isActive) return;

        const resources = buildGameBoardCatalogResources(data);
        cardCatalogByIdRef.current = resources.catalogById;
        setCardStatLookup(resources.statLookup);
        setCardDetailLookup(resources.detailLookup);
        cardDetailLookupRef.current = resources.detailLookup;
        evolveAutoAttachResolverRef.current = resources.evolveAutoAttachResolver;
        fieldLinkAutoAttachResolverRef.current = resources.fieldLinkAutoAttachResolver;
        fieldLinkCardIdsRef.current = resources.fieldLinkCardIds;
        tokenManualLinkCardIdsRef.current = resources.tokenManualLinkCardIds;
        setCatalogCards(data);
        retryQueued.current = false;
        setCatalogStatus('ready');
      })
      .catch(err => {
        if (!isActive) return;
        console.error('Could not load card stats', err);
        retryQueued.current = false;
        setCatalogStatus('error');
      });

    return () => {
      isActive = false;
      cardCatalogByIdRef.current = {};
      cardDetailLookupRef.current = {};
      evolveAutoAttachResolverRef.current = null;
      fieldLinkAutoAttachResolverRef.current = null;
      fieldLinkCardIdsRef.current = new Set();
      tokenManualLinkCardIdsRef.current = new Set();
    };
  }, [attempt]);

  return {
    catalogCards, catalogStatus, retryCatalog,
    cardStatLookup,
    cardDetailLookup,
    cardDetailLookupRef,
    cardCatalogByIdRef,
    evolveAutoAttachResolverRef,
    fieldLinkAutoAttachResolverRef,
    fieldLinkCardIdsRef,
    tokenManualLinkCardIdsRef,
  };
};
