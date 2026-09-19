export interface EventDeduper {
  markIfNew(eventId: string): boolean;
  reset(): void;
}

export const createEventDeduper = (maxSize = 500): EventDeduper => {
  const processedIds = new Set<string>();
  const order: string[] = [];

  return {
    markIfNew(eventId: string) {
      if (processedIds.has(eventId)) {
        return false;
      }

      processedIds.add(eventId);
      order.push(eventId);

      if (order.length > maxSize) {
        const oldestId = order.shift();
        if (oldestId) {
          processedIds.delete(oldestId);
        }
      }

      return true;
    },

    reset() {
      processedIds.clear();
      order.length = 0;
    },
  };
};
