import { describe, expect, it } from 'vitest';
import { getWaitingForHostSessionDecision } from './gameBoardWaitingForHostSession';

describe('getWaitingForHostSessionDecision', () => {
  it('ignores the message on the host side', () => {
    expect(getWaitingForHostSessionDecision({ isHost: true })).toEqual({
      type: 'ignore',
    });
  });

  it('sets the waiting status on the guest side', () => {
    expect(getWaitingForHostSessionDecision({ isHost: false })).toEqual({
      type: 'set-status',
      statusKey: 'gameBoard.status.waitingForHostDecision',
    });
  });
});
