const MAX_ACTIVE = 4;
const TIMEOUT_MS = 30_000;

/** Per-catalog detail work; the queue never contains game events. */
export const createCatalogDetailQueue = () => {
  let active = 0;
  const waiting: Array<() => void> = [];
  const drain = () => {
    while (active < MAX_ACTIVE && waiting.length) waiting.shift()!();
  };
  return <T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    waiting.push(() => {
      active++;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_yes, no) => {
        timer = setTimeout(() => {
          no(new Error('Card catalog detail request timed out'));
          controller.abort();
        }, TIMEOUT_MS);
      });
      // An async wrapper turns synchronous task throws into rejected work too.
      const work = (async () => task(controller.signal))();
      void (async () => {
        try { resolve(await Promise.race([work, deadline])); }
        catch (error) { reject(error); }
        finally {
          clearTimeout(timer);
          active--;
          drain();
        }
      })();
    });
    drain();
  });
};
