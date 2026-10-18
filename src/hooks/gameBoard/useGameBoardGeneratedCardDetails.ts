import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../../utils/card/generatedCardCatalog';
import { buildCardDetailLookup, type CardDetailLookup } from '../../utils/card/cardDetails';
import { createGameBoardCatalogDetails } from '../../utils/gameBoard/gameBoardCatalogDetails';

type DetailsContext = {
  catalog: GeneratedCardCatalog;
  loader: ReturnType<typeof createGameBoardCatalogDetails>;
  known: Map<string, GeneratedCardDetails>;
  knownIds: ReadonlySet<string>;
};
export type GameBoardCardDetailStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unknown';
type Request = { context: DetailsContext | null; key: string; attempt: number };
type RequestState =
  | { status: 'ready'; requestedIds: readonly string[]; unknownIds: readonly string[] }
  | { status: 'error'; error: unknown };
type Snapshot = { context: DetailsContext; cards: readonly GeneratedCardDetails[]; lookup: CardDetailLookup };
const EMPTY_CARDS: readonly GeneratedCardDetails[] = Object.freeze([]);
const EMPTY_LOOKUP: CardDetailLookup = Object.freeze({});

/** Presentation data only. Never delays or applies a game event or snapshot. */
export const useGameBoardGeneratedCardDetails = (catalog: GeneratedCardCatalog | null, ids: readonly string[]) => {
  const context = useMemo<DetailsContext | null>(() => catalog ? {
    catalog, loader: createGameBoardCatalogDetails(catalog), known: new Map(), knownIds: new Set(catalog.index.map(card => card.id)),
  } : null, [catalog]);
  const key = JSON.stringify(ids);
  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<Request>({ context, key, attempt });
  // Distinct request identities also protect A -> B -> A before effects settle.
  if (request.context !== context || request.key !== key || request.attempt !== attempt) {
    setRequest({ context, key, attempt });
  }
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [settled, setSettled] = useState<{ request: Request; value: RequestState } | null>(null);
  const lifetime = useRef<{ context: DetailsContext | null; active: boolean } | null>(null);
  const retryState = useRef<{ allowed: boolean; queued: boolean } | null>(null);
  const retry = useCallback(() => {
    const current = retryState.current;
    if (!current?.allowed || current.queued) return;
    current.queued = true;
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    // A new lifetime is necessary even if Strict Mode reuses the same context.
    const current = { context, active: true };
    lifetime.current = current;
    return () => { current.active = false; };
  }, [context]);

  useEffect(() => {
    const selected: string[] = JSON.parse(request.key);
    const source = request.context;
    const currentLifetime = lifetime.current;
    if (!source || selected.length === 0 || currentLifetime?.context !== source) return;
    let currentRequest = true;
    void source.loader.load(selected).then(result => {
      if (!currentLifetime.active) return;
      let changed = false;
      for (const card of result.cards) {
        if (!source.known.has(card.id)) { source.known.set(card.id, card); changed = true; }
      }
      if (changed || source.known.size === 0) {
        // Completion order must not change catalog ordering or lose the other
        // request's verified data. Only complete successful batches enter here.
        const cards = Object.freeze(source.catalog.index
          .map(card => source.known.get(card.id))
          .filter((card): card is GeneratedCardDetails => card !== undefined));
        setSnapshot({ context: source, cards, lookup: buildCardDetailLookup(cards) });
      }
      if (currentRequest) setSettled({ request, value: {
        status: 'ready', requestedIds: result.requestedIds, unknownIds: result.unknownIds,
      } });
    }).catch(error => {
      if (currentLifetime.active && currentRequest) setSettled({ request, value: { status: 'error', error } });
    });
    // Keep same-version successes as reusable presentation data. Only the
    // current request can change the visible status/error, and another catalog
    // or unmounted lifetime must never publish even a successful response.
    return () => { currentRequest = false; };
  }, [request]);

  const cached = snapshot?.context === context ? snapshot : null;
  const status: RequestState | { status: 'idle' | 'loading' } = !catalog || ids.length === 0
    ? { status: 'idle' }
    : request.context === context && request.key === key && request.attempt === attempt && settled?.request === request
      ? settled.value : { status: 'loading' };
  useLayoutEffect(() => {
    retryState.current = { allowed: status.status === 'error', queued: false };
    return () => { retryState.current = null; };
  }, [request, status.status]);
  const requestedIds = new Set<string>(JSON.parse(key));
  const getDetailStatus = (id: string): GameBoardCardDetailStatus => {
    if (!context) return 'idle';
    if (!context.knownIds.has(id)) return 'unknown';
    if (cached && Object.hasOwn(cached.lookup, id)) return 'ready';
    if (!requestedIds.has(id)) return 'idle';
    return status.status === 'error' ? 'error' : 'loading';
  };
  return { ...status, version: catalog?.version ?? null,
    knownCards: cached?.cards ?? EMPTY_CARDS, detailLookup: cached?.lookup ?? EMPTY_LOOKUP, retry, getDetailStatus };
};
