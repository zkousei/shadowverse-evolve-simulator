import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardPlayerControlsPanel from './GameBoardPlayerControlsPanel';
import GameBoardInputProfileProvider from '../contexts/GameBoardInputProfileProvider';
import { initialState } from '../types/game';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'gameBoard.zones.controls') return `${options?.label ?? ''} Controls`;
      if (key === 'gameBoard.zones.draw') return 'Draw';
      if (key === 'gameBoard.zones.mill') return 'Mill';
      if (key === 'gameBoard.zones.topToEx') return 'Top to EX';
      if (key === 'gameBoard.zones.spawnToken') return 'Spawn Token';
      if (key === 'gameBoard.board.stats.hp') return 'HP';
      if (key === 'gameBoard.board.stats.playPoints') return 'PP';
      return key;
    },
  }),
}));

vi.mock('./GameBoardPlayerTrackerSection', () => ({
  default: ({ testId, compact }: { testId: string; compact?: boolean }) => (
    <div data-testid={testId} data-compact={String(Boolean(compact))}>Tracker</div>
  ),
}));

const renderWithInputProfile = (
  profile: 'fine' | 'coarse',
  ui: React.ReactElement,
  boardDensity: 'standard' | 'overview' = 'standard'
) => render(
  <GameBoardInputProfileProvider value={profile} boardDensity={boardDensity}>
    {ui}
  </GameBoardInputProfileProvider>
);

const createBaseProps = () => ({
  label: 'Player 1',
  panelWidth: 220,
  gameStatus: 'playing' as const,
  importDeckLabel: 'Import Deck',
  loadSavedDeckLabel: 'Load from My Decks',
  canImportDeck: true,
  canOpenSavedDeckPicker: true,
  onDeckUpload: vi.fn(),
  onOpenSavedDeckPicker: vi.fn(),
  canUsePlayingActions: true,
  onDraw: vi.fn(),
  onMill: vi.fn(),
  onMoveTopCardToEx: vi.fn(),
  drawButtonBackground: '#3b82f6',
  canOpenTokenSpawn: true,
  onOpenTokenSpawn: vi.fn(),
  spawnButtonBackground: '#f59e0b',
  trackerTestId: 'player-tracker',
  playerState: initialState.host,
  onAdjustStat: vi.fn(),
});

describe('GameBoardPlayerControlsPanel', () => {
  it('keeps the primary actions stacked in a single column for fine input', () => {
    render(
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
      />
    );

    expect(screen.getByTestId('player-controls-primary-actions')).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('renders the primary actions in a two-column grid for coarse input', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
      />
    );

    expect(screen.getByTestId('player-controls-primary-actions')).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    });
  });

  it('keeps draw action wiring intact in compact coarse mode', () => {
    const props = createBaseProps();

    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...props}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    expect(props.onDraw).toHaveBeenCalledTimes(1);
  });

  it('uses readable text colors for primary action buttons', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
      />
    );

    expect(screen.getByRole('button', { name: 'Draw' })).toHaveStyle({ color: 'rgb(248, 250, 252)' });
    expect(screen.getByRole('button', { name: 'Mill' })).toHaveStyle({ color: 'rgb(248, 250, 252)' });
    expect(screen.getByRole('button', { name: 'Top to EX' })).toHaveStyle({ color: 'rgb(248, 250, 252)' });
    expect(screen.getByRole('button', { name: 'Spawn Token' })).toHaveStyle({ color: 'rgb(248, 250, 252)' });
  });

  it('hides playing-only actions while preparing and keeps setup actions visible', () => {
    render(
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        gameStatus="preparing"
        canUsePlayingActions={false}
      />
    );

    expect(screen.getByText('Import Deck')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load from My Decks' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Draw' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mill' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Top to EX' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spawn Token' })).toBeInTheDocument();
  });

  it('hides setup-only actions while playing and keeps playing actions visible', () => {
    render(
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        gameStatus="playing"
        canImportDeck={false}
      />
    );

    expect(screen.queryByText('Import Deck')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load from My Decks' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draw' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top to EX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spawn Token' })).toBeInTheDocument();
  });

  it('keeps in-phase playing actions visible when interaction is temporarily blocked', () => {
    render(
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        gameStatus="playing"
        canUsePlayingActions={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Draw' })).toBeDisabled();
  });

  it('uses compact typography and touch target sizing for coarse input buttons', () => {
    const { unmount } = renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
      />
    );

    expect(screen.getByRole('button', { name: 'Draw' })).toHaveStyle({ fontSize: '0.64rem', minHeight: '30px' });
    expect(screen.getByRole('button', { name: 'Draw' })).toHaveStyle({ whiteSpace: 'normal' });

    unmount();
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        gameStatus="preparing"
      />
    );

    expect(screen.getByRole('button', { name: 'Load from My Decks' })).toHaveStyle({ fontSize: '0.66rem', minHeight: '30px' });
    expect(screen.getByRole('button', { name: 'Load from My Decks' })).toHaveStyle({ gridColumn: '1 / -1' });
  });

  it('keeps desktop overview controls stacked like the standard desktop panel', () => {
    renderWithInputProfile(
      'fine',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
      />,
      'overview'
    );

    expect(screen.getByTestId('player-controls-primary-actions')).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
    });
    expect(screen.getByText('Player 1 Controls')).toHaveStyle({ fontSize: '0.64rem' });
    expect(screen.getByRole('button', { name: 'Draw' })).toHaveStyle({ padding: '0.4rem' });
    expect(screen.queryByRole('button', { name: 'Load from My Decks' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spawn Token' })).toBeInTheDocument();
    expect(screen.getByTestId('player-tracker')).toHaveAttribute('data-compact', 'false');
    expect(screen.queryByTestId('player-controls-tracker-disclosure')).not.toBeInTheDocument();
  });

  it('passes compact tracker mode on narrow coarse panels to avoid vertical wrapping', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        panelWidth={132}
      />
    );

    expect(screen.getByTestId('player-tracker')).toHaveAttribute('data-compact', 'true');
  });

  it('renders the tracker directly in coarse mode without a collapsed disclosure', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        panelWidth={132}
      />
    );

    expect(screen.queryByTestId('player-controls-tracker-disclosure')).not.toBeInTheDocument();
    expect(screen.queryByTestId('player-controls-tracker-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('player-tracker')).toHaveAttribute('data-compact', 'true');
  });

  it('keeps the tracker expanded when compact mode is explicitly disabled', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        panelWidth={132}
        forceExpandedTracker={true}
      />
    );

    expect(screen.getByTestId('player-tracker')).toHaveAttribute('data-compact', 'false');
  });

  it('keeps tracker in regular mode on desktop width panels', () => {
    render(
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        panelWidth={220}
      />
    );

    expect(screen.getByTestId('player-tracker')).toHaveAttribute('data-compact', 'false');
    expect(screen.queryByTestId('player-controls-tracker-disclosure')).not.toBeInTheDocument();
  });
});
