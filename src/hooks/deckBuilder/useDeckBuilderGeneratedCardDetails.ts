import { useCallback, useEffect, useState } from 'react';
import type { GeneratedCardCatalog, GeneratedCardDetails } from '../../utils/card/generatedCardCatalog';

export type DeckBuilderGeneratedCardDetailsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; version: string; cards: readonly GeneratedCardDetails[] }
  | { status: 'error'; error: unknown };

type DetailsRequest = {
  catalog: GeneratedCardCatalog | null;
  key: string;
  attempt: number;
};
type SettledDetails = { request: DetailsRequest; value: DeckBuilderGeneratedCardDetailsState };

/** One current selection per consumer. This is not a queue for deck mutations. */
export const useDeckBuilderGeneratedCardDetails = (
  catalog: GeneratedCardCatalog | null,
  ids: readonly string[],
  includeRelated = false,
): DeckBuilderGeneratedCardDetailsState & { retry: () => void } => {
  // Snapshot the request by value, so fresh arrays do not trigger another load
  // and caller mutation cannot change a pending request.
  const key = JSON.stringify({ ids, includeRelated });
  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<DetailsRequest>({ catalog, key, attempt });
  // A return to the same IDs after another selection is a new request too.
  if (request.catalog !== catalog || request.key !== key || request.attempt !== attempt) {
    setRequest({ catalog, key, attempt });
  }
  const [settled, setSettled] = useState<SettledDetails | null>(null);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    const source = request.catalog;
    if (!source) return;
    const selection = JSON.parse(request.key) as { ids: string[]; includeRelated: boolean };
    if (selection.ids.length === 0) return;
    let active = true;
    void (async () => {
      try {
        const cards = await (selection.includeRelated
          ? source.loadCardsWithRelated(selection.ids) : source.loadCards(selection.ids));
        if (active) setSettled({ request,
          value: { status: 'ready', version: source.version, cards } });
      } catch (error) {
        if (active) setSettled({ request, value: { status: 'error', error } });
      }
    })();
    // Discard this consumer's result without aborting a shared group request.
    return () => { active = false; };
  }, [request]);

  if (!catalog || ids.length === 0) return { status: 'idle', retry };
  const value: DeckBuilderGeneratedCardDetailsState = request.catalog === catalog && request.key === key &&
    request.attempt === attempt && settled?.request === request ? settled.value : { status: 'loading' };
  return { ...value, retry };
};
