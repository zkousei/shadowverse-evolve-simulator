import { describe, expect, it } from 'vitest';
import { getIncomingEventDecision } from './gameBoardIncomingEvent';

describe('getIncomingEventDecision', () => {
  it('applies incoming events on the host side', () => {
    expect(getIncomingEventDecision({ isHost: true })).toEqual({
      type: 'apply',
      source: 'guest',
    });
  });

  it('ignores incoming events on the guest side', () => {
    expect(getIncomingEventDecision({ isHost: false })).toEqual({
      type: 'ignore',
    });
  });
});
