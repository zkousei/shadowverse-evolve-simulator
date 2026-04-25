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
      marginTop: '0.18rem',
      padding: '0.32rem',
      gap: '0.2rem',
    });
    expect(screen.getByText('Player 2 Status')).toHaveStyle({
      fontSize: '0.66rem',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    });
    expect(screen.getByText('HP: 20').parentElement).toHaveStyle({
      flexWrap: 'nowrap',
      gap: '0.14rem',
    });
    expect(screen.queryByText(/Combo/)).not.toBeInTheDocument();
  });

  it('uses slightly larger compact status text for tablet readability', () => {
    render(
      <GameBoardPlayerTracker
        {...createBaseProps()}
        compact={true}
      />
    );

    expect(screen.getByText('HP: 20')).toHaveStyle({ fontSize: '0.66rem' });
    expect(screen.getByText('EP: 2')).toHaveStyle({ fontSize: '0.66rem' });
    expect(screen.getByText('PP')).toHaveStyle({ fontSize: '0.62rem' });
    expect(screen.getByText('MAX')).toHaveStyle({ fontSize: '0.58rem' });
    expect(screen.getByText('3')).toHaveStyle({ fontSize: '1.28rem' });
    expect(screen.getByText('4')).toHaveStyle({ fontSize: '1rem' });
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
    expect(screen.queryByTestId('player-tracker-host-combo-increase')).not.toBeInTheDocument();
    expect(screen.queryByTestId('player-tracker-host-combo-decrease')).not.toBeInTheDocument();
  });

  it('uses compact fixed-size adjustment buttons to reduce tracker height without layout drift', () => {
    render(
      <GameBoardPlayerTracker
        {...createBaseProps()}
        compact={true}
      />
    );

    expect(screen.getByTestId('player-tracker-host-hp-increase')).toHaveStyle({
      minWidth: '22px',
      minHeight: '20px',
      padding: '1px 5px',
      fontSize: '0.68rem',
    });
    expect(screen.getByTestId('player-tracker-host-maxPp-increase')).toHaveStyle({
      width: '22px',
      height: '20px',
      minWidth: '22px',
      fontSize: '0.68rem',
    });
    expect(screen.getByTestId('player-tracker-host-pp-increase')).toHaveStyle({
      width: '24px',
      height: '24px',
      fontSize: '0.86rem',
      borderRadius: '50%',
    });
  });
});
