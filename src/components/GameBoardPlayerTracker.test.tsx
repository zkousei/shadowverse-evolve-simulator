import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardPlayerTracker from './GameBoardPlayerTracker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'gameBoard.board.statusLabel') return `${options?.label ?? ''} Status`;
      if (key === 'gameBoard.board.stats.hp') return 'HP';
      if (key === 'gameBoard.board.stats.ep') return 'EP';
      if (key === 'gameBoard.board.stats.sep') return 'SEP';
      if (key === 'gameBoard.board.stats.combo') return 'Combo';
      if (key === 'gameBoard.board.stats.max') return 'MAX';
      if (key === 'gameBoard.board.stats.playPoints') return 'PP';
      return key;
    },
  }),
}));

const createBaseProps = () => ({
  testId: 'player-tracker-host',
  label: 'Player 2',
  hp: 20,
  ep: 2,
  sep: 1,
  combo: 0,
  pp: 3,
  maxPp: 4,
  onAdjustStat: vi.fn(),
});

describe('GameBoardPlayerTracker', () => {
  it('uses compact spacing and nowrap rows when compact mode is enabled', () => {
    render(
      <GameBoardPlayerTracker
        {...createBaseProps()}
        compact={true}
      />
    );

    expect(screen.getByTestId('player-tracker-host')).toHaveStyle({
      marginTop: '0.25rem',
      padding: '0.36rem',
      gap: '0.24rem',
    });
    expect(screen.getByText('Player 2 Status')).toHaveStyle({
      fontSize: '0.62rem',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    });
    expect(screen.getByText('HP: 20').parentElement).toHaveStyle({
      flexWrap: 'nowrap',
      gap: '0.16rem',
    });
  });

  it('keeps tracker adjustment wiring in compact mode', () => {
    const props = createBaseProps();

    render(
      <GameBoardPlayerTracker
        {...props}
        compact={true}
      />
    );

    fireEvent.click(screen.getByTestId('player-tracker-host-hp-increase'));
    fireEvent.click(screen.getByTestId('player-tracker-host-pp-decrease'));

    expect(props.onAdjustStat).toHaveBeenCalledWith('hp', 1);
    expect(props.onAdjustStat).toHaveBeenCalledWith('pp', -1);
  });
});
