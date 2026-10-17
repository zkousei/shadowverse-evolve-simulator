import { useCallback, useEffect, useRef, useState } from 'react';

/** One atomic import/load/export at a time. Ordinary card additions stay synchronous. */
export const useDeckBuilderCatalogAction = () => {
  const epoch = useRef(0);
  const busy = useRef(false);
  const alive = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const deactivate = useCallback(() => { alive.current = false; epoch.current++; busy.current = false; }, []);
  useEffect(() => {
    alive.current = true;
    return deactivate;
  }, [deactivate]);
  const cancel = useCallback(() => {
    epoch.current++;
    busy.current = false;
    setPending(false);
    setFailure(null);
  }, []);
  const run = useCallback(<T,>(load: () => Promise<T>, apply: (value: T) => void, onError?: (error: unknown) => void): boolean => {
    if (!alive.current || busy.current) return false;
    const current = epoch.current;
    busy.current = true;
    setPending(true);
    setFailure(null);
    void (async () => {
      try {
        const value = await load();
        if (alive.current && current === epoch.current) apply(value);
      } catch (error) {
        if (alive.current && current === epoch.current) { setFailure({ error }); onError?.(error); }
      } finally {
        if (alive.current && current === epoch.current) {
          busy.current = false;
          setPending(false);
        }
      }
    })();
    return true;
  }, []);
  const isPending = useCallback(() => busy.current, []);
  return { pending, failure, run, cancel, isPending };
};
