import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockPeerJs,
  renderHarness,
  renderResumedHostHarness,
} from './__tests__/gameBoardTestUtils';

describe('useGameBoardSystemActions', () => {
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

  it('uses the Player 2 actor for solo Player 2 quick card moves', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Guest Token Batch to EX' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('2');
    expect(screen.getByTestId('guest-cemetery-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Send First Guest EX Card to Cemetery' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('guest-cemetery-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('guest-ex-count')).toHaveTextContent('2');
    expect(screen.getByTestId('guest-cemetery-count')).toHaveTextContent('0');
  });

  it('shuffles the host deck and shows the shared notification without creating an undoable move', () => {
    renderResumedHostHarness({
      cards: [
        {
          id: 'deck-card-1',
          cardId: 'BP01-001',
          name: 'Aurelia',
          image: '/aurelia.png',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'deck-card-2',
          cardId: 'BP01-002',
          name: 'Bellringer Angel',
          image: '/bellringer-angel.png',
          zone: 'mainDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: true,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('2');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle Host Deck' }));

    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('2');
    expect(screen.getByTestId('card-play-message')).toHaveTextContent('You shuffled the deck');
    expect(screen.getByTestId('event-history')).toHaveTextContent('You shuffled the deck');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('toggles reveal hands mode on and off for the host state', () => {
    renderResumedHostHarness({
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('reveal-hands-mode')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Enable Reveal Hands' }));
    expect(screen.getByTestId('reveal-hands-mode')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Disable Reveal Hands' }));
    expect(screen.getByTestId('reveal-hands-mode')).toHaveTextContent('false');
  });
});
