import { useLayoutEffect, useMemo, useRef } from 'react';
import type { SyncState } from '../../types/game';
import type { CardInstance } from '../../components/Card';
import type { CardDetailLookup } from '../../utils/card/cardDetails';
import type { GeneratedCardIndexEntry } from '../../utils/card/generatedCardCatalog';
import type { GameBoardSavedDeckReader } from '../../utils/gameBoard/gameBoardSavedDeckReader';
import { buildGameBoardCatalogMetadata } from '../../utils/gameBoard/gameBoardCatalog';
import { useGameBoardGeneratedCatalogResources } from './useGameBoardGeneratedCatalogResources';

const EMPTY_METADATA = buildGameBoardCatalogMetadata([]);
const EMPTY_READER: GameBoardSavedDeckReader = Object.freeze({ version: '', summaries: [],
  loadCards: async () => { throw new Error('Card catalog is not ready'); },
});

/** Connect read-only resources after state changes; never gate game events on HTTP. */
export const useGameBoardActiveCatalogResources = (state: SyncState, top: readonly CardInstance[] = []) => {
  // Movement, counters and input order do not change the selected detail set.
  const ids = [...new Set([...state.cards, ...state.tokenOptions.host, ...state.tokenOptions.guest, ...top]
    .map(card => card.cardId))].sort();
  const source = useGameBoardGeneratedCatalogResources(ids);
  const metadata = source.resources?.metadata ?? EMPTY_METADATA;
  const indexById = useMemo(() => Object.fromEntries((source.resources?.catalog.index ?? []).map(card => [card.id, card])), [source.resources]);
  const cardDetailLookup = source.details.detailLookup;
  const cardDetailLookupRef = useRef<CardDetailLookup>({});
  const cardCatalogByIdRef = useRef<Record<string, GeneratedCardIndexEntry>>({});
  const evolveAutoAttachResolverRef = useRef<typeof metadata.evolveAutoAttachResolver | null>(null);
  const fieldLinkAutoAttachResolverRef = useRef<typeof metadata.fieldLinkAutoAttachResolver | null>(null);
  const fieldLinkCardIdsRef = useRef(new Set<string>());
  const tokenManualLinkCardIdsRef = useRef(new Set<string>());
  useLayoutEffect(() => {
    cardDetailLookupRef.current = cardDetailLookup;
    cardCatalogByIdRef.current = indexById;
    evolveAutoAttachResolverRef.current = source.resources ? metadata.evolveAutoAttachResolver : null;
    fieldLinkAutoAttachResolverRef.current = source.resources ? metadata.fieldLinkAutoAttachResolver : null;
    fieldLinkCardIdsRef.current = metadata.fieldLinkCardIds;
    tokenManualLinkCardIdsRef.current = metadata.tokenManualLinkCardIds;
    return () => {
      cardDetailLookupRef.current = {};
      cardCatalogByIdRef.current = {};
      evolveAutoAttachResolverRef.current = null;
      fieldLinkAutoAttachResolverRef.current = null;
      fieldLinkCardIdsRef.current = new Set();
      tokenManualLinkCardIdsRef.current = new Set();
    };
  }, [source.resources, metadata, indexById, cardDetailLookup]);
  // Restore omitted snapshot artwork for presentation only, even if details
  // fail. Do not overwrite custom input images or mutate synchronized state.
  const displayCards = useMemo(() => state.cards.map(card => !card.image && indexById[card.cardId]?.image
    ? { ...card, image: indexById[card.cardId].image! } : card), [state.cards, indexById]);
  return {
    catalogStatus: source.status, retryCatalog: source.refreshCatalog,
    generatedCatalog: source.resources?.savedDeckCatalog ?? EMPTY_READER,
    cardStatLookup: metadata.statLookup, cardDetailLookup, cardDetailLookupRef, cardCatalogByIdRef,
    evolveAutoAttachResolverRef, fieldLinkAutoAttachResolverRef, fieldLinkCardIdsRef, tokenManualLinkCardIdsRef,
    displayCards, getDetailStatus: source.details.getDetailStatus, retryDetails: source.details.retry,
    isRefreshingCatalog: source.status === 'loading', catalogRefreshFailed: source.status === 'error',
  };
};
