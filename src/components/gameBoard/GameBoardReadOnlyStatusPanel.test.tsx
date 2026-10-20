import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardReadOnlyStatusPanel from './GameBoardReadOnlyStatusPanel';
import GameBoardInputProfileProvider from '../../contexts/GameBoardInputProfileProvider';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'gameBoard.board.statusLabel') return `${options?.label ?? ''} Status`;
      if (key === 'gameBoard.board.stats.hp') return 'HP';
      if (key === 'gameBoard.board.stats.ep') return 'EP';
      if (key === 'gameBoard.board.stats.sep') return 'SEP';
      return key;
    },
  }),
}));

describe('GameBoardReadOnlyStatusPanel', () => {
  it('renders desktop spacing and vertical stat rows by default', () => {
    render(
      <GameBoardReadOnlyStatusPanel
        label="Opponent"
        hp={20}
        pp={3}
        maxPp={5}
        ep={1}
        sep={1}
      />
    );

    expect(screen.getByTestId('readonly-status-panel')).toHaveAttribute('data-compact', 'false');
    expect(screen.getByTestId('readonly-status-panel')).toHaveStyle({
      padding: '0.9rem 1rem',
      gap: '0.55rem',
    });
    expect(screen.getByTestId('readonly-status-stats')).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('switches to a compact two-column stat grid on mobile layout', () => {
    render(
      <GameBoardInputProfileProvider value="coarse" layoutProfile="mobile">
        <GameBoardReadOnlyStatusPanel
          label="Opponent"
          hp={18}
          pp={4}
          maxPp={6}
          ep={2}
          sep={1}
        />
      </GameBoardInputProfileProvider>
    );

    expect(screen.getByTestId('readonly-status-panel')).toHaveAttribute('data-compact', 'true');
    expect(screen.getByTestId('readonly-status-panel')).toHaveStyle({
      padding: '0.32rem 0.42rem',
      gap: '0.2rem',
    });
    expect(screen.getByTestId('readonly-status-stats')).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    });
    expect(screen.getByText('18')).toBeInTheDocument();
  });
});
