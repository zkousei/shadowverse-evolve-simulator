import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { openGeneratedCardCatalog, type GeneratedCardCatalog } from '../../utils/card/generatedCardCatalog';
import { buildGameBoardCatalogMetadata } from '../../utils/gameBoard/gameBoardCatalog';
import { createGameBoardCatalogDetails } from '../../utils/gameBoard/gameBoardCatalogDetails';
import { createGameBoardSavedDeckReader } from '../../utils/gameBoard/gameBoardSavedDeckReader';
import { useGameBoardGeneratedCardDetails } from './useGameBoardGeneratedCardDetails';

type Resources = {
  readonly catalog: GeneratedCardCatalog;
  readonly metadata: ReturnType<typeof buildGameBoardCatalogMetadata>;
  readonly savedDeckCatalog: ReturnType<typeof createGameBoardSavedDeckReader>;
};
type Scope = { path: string };
type Request = { scope: Scope; previous: Resources | null };

/** Opt-in presentation resource. Never mutates a board, storage, or transport.
 * Detail retry stays pinned; refreshCatalog explicitly opens a replacement.
 */
export const useGameBoardGeneratedCatalogResources = (ids: readonly string[], basePath = '/card-catalog') => {
  const scope = useMemo(() => ({ path: basePath }), [basePath]);
  const [request, setRequest] = useState<Request>({ scope, previous: null });
  if (request.scope !== scope) setRequest({ scope, previous: null });
  const [installed, setInstalled] = useState<{ scope: Scope; resources: Resources } | null>(null);
  const [settled, setSettled] = useState<{ request: Request; status: 'ready' | 'error'; error?: unknown } | null>(null);
  const resources = installed?.scope === scope ? installed.resources : null;
  const key = JSON.stringify(ids);
  const latestIds = useRef({ scope, key });
  useLayoutEffect(() => { latestIds.current = { scope, key }; }, [scope, key]);
  const gate = useRef<{ request: Request; resources: Resources | null; allowed: boolean; queued: boolean } | null>(null);
  const refreshCatalog = useCallback(() => {
    const current = gate.current;
    if (!current?.allowed || current.queued) return;
    current.queued = true;
    setRequest({ scope: current.request.scope, previous: current.resources });
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const catalog = await openGeneratedCardCatalog(request.scope.path);
        if (!active) return;
        const candidate = Object.freeze({ catalog,
          metadata: buildGameBoardCatalogMetadata(catalog.index),
          savedDeckCatalog: createGameBoardSavedDeckReader(catalog),
        });
        if (request.previous) {
          // Keep the installed version until the replacement can serve the live
          // selection. A board change during this await must be checked again.
          const loader = createGameBoardCatalogDetails(catalog);
          while (active && latestIds.current.scope === request.scope) {
            const selected = latestIds.current.key;
            await loader.load(JSON.parse(selected) as string[]);
            if (!active) return;
            if (latestIds.current.scope !== request.scope) return;
            if (latestIds.current.key === selected) break;
          }
        }
        if (!active || latestIds.current.scope !== request.scope) return;
        setInstalled({ scope: request.scope, resources: candidate });
        setSettled({ request, status: 'ready' });
      } catch (error) {
        if (active) setSettled({ request, status: 'error', error });
      }
    })();
    return () => { active = false; };
  }, [request]);

  const status: 'ready' | 'error' | 'loading' = settled?.request === request ? settled.status : 'loading';
  useLayoutEffect(() => {
    gate.current = { request, resources, allowed: status !== 'loading', queued: false };
    return () => { gate.current = null; };
  }, [request, resources, status]);
  const details = useGameBoardGeneratedCardDetails(resources?.catalog ?? null, ids);
  return { status, error: status === 'error' ? settled?.error : null, resources, details, refreshCatalog };
};
