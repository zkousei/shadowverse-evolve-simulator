import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockPeerJs,
  renderResumedHostHarness,
} from './__tests__/gameBoardTestUtils';

describe('useGameBoardCardActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPeerJs.reset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('plays a hand card to the field and shows the local play notification', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'hand-card',
        cardId: 'BP01-003',
        name: 'Quickblader',
        image: '/quickblader.png',
        zone: 'hand-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Play Hand Card to Field' }));

    expect(screen.getByTestId('host-hand-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('You played to field Quickblader');
    expect(screen.getByTestId('event-history')).not.toHaveTextContent('You played to field Quickblader');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('declares an attack against the guest leader and records the attack history', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'attacker-card',
        cardId: 'BP01-004',
        name: 'Knight',
        image: '/knight.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnPlayer: 'host',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Declare Attack to Guest Leader' }));

    expect(screen.getByTestId('attack-message')).toHaveTextContent('You Knight attacks Opponent Leader');
    expect(screen.getByTestId('event-history')).toHaveTextContent('Knight -> Opponent Leader');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('none');
  });
});
