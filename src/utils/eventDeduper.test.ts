import { describe, expect, it } from 'vitest';
import { createEventDeduper } from './eventDeduper';

describe('eventDeduper', () => {
  it('accepts a new event id once and rejects duplicates', () => {
    const deduper = createEventDeduper();

    expect(deduper.markIfNew('evt-1')).toBe(true);
    expect(deduper.markIfNew('evt-1')).toBe(false);
  });

  it('forgets the oldest ids after the max size is exceeded', () => {
    const deduper = createEventDeduper(2);

    expect(deduper.markIfNew('evt-1')).toBe(true);
    expect(deduper.markIfNew('evt-2')).toBe(true);
    expect(deduper.markIfNew('evt-3')).toBe(true);
    expect(deduper.markIfNew('evt-1')).toBe(true);
    expect(deduper.markIfNew('evt-3')).toBe(false);
  });

  it('can be reset between sessions', () => {
    const deduper = createEventDeduper();

    expect(deduper.markIfNew('evt-1')).toBe(true);
    deduper.reset();
    expect(deduper.markIfNew('evt-1')).toBe(true);
  });
});
