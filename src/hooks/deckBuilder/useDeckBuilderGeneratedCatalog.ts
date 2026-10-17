import { useCallback, useEffect, useState } from 'react';
import { openGeneratedCardCatalog, type GeneratedCardCatalog } from '../../utils/card/generatedCardCatalog';

export type DeckBuilderGeneratedCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: GeneratedCardCatalog }
  | { status: 'error'; error: unknown };

type CatalogRequest = { path: string; attempt: number };
type SettledCatalog = { request: CatalogRequest; value: DeckBuilderGeneratedCatalogState };

/** Opt-in resource only: never installs data into a deck or changes saved state. */
export const useDeckBuilderGeneratedCatalog = (basePath = '/card-catalog'):
  DeckBuilderGeneratedCatalogState & { retry: () => void } => {
  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<CatalogRequest>({ path: basePath, attempt });
  // Keep a distinct identity for every transition, including A -> B -> A.
  if (request.path !== basePath || request.attempt !== attempt) {
    setRequest({ path: basePath, attempt });
  }
  const [settled, setSettled] = useState<SettledCatalog | null>(null);
  const retry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const catalog = await openGeneratedCardCatalog(request.path);
        if (active) setSettled({ request, value: { status: 'ready', catalog } });
      } catch (error) {
        if (active) setSettled({ request, value: { status: 'error', error } });
      }
    })();
    return () => { active = false; };
  }, [request]);

  // Invalidate during render, before effect cleanup: an old catalog must never
  // appear as the result of a new path or explicit reopening attempt. A new
  // request identity also prevents A -> B -> A from reviving the first A result.
  const value: DeckBuilderGeneratedCatalogState = request.path === basePath && request.attempt === attempt && settled?.request === request
    ? settled.value : { status: 'loading' };
  return { ...value, retry };
};
