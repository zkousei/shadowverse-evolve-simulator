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
  ui: React.ReactElement
) => render(
  <GameBoardInputProfileProvider value={profile}>
    {ui}
  </GameBoardInputProfileProvider>
);

const createBaseProps = () => ({
  label: 'Player 1',
  panelWidth: 220,
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

  it('uses compact typography and touch target sizing for coarse input buttons', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
      />
    );

    expect(screen.getByRole('button', { name: 'Draw' })).toHaveStyle({ fontSize: '0.64rem', minHeight: '30px' });
    expect(screen.getByRole('button', { name: 'Load from My Decks' })).toHaveStyle({ fontSize: '0.66rem', minHeight: '30px' });
    expect(screen.getByRole('button', { name: 'Draw' })).toHaveStyle({ whiteSpace: 'normal' });
    expect(screen.getByRole('button', { name: 'Load from My Decks' })).toHaveStyle({ gridColumn: '1 / -1' });
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

  it('uses collapsed tracker disclosure in coarse mode to save vertical space', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardPlayerControlsPanel
        {...createBaseProps()}
        panelWidth={132}
      />
    );

    expect(screen.getByTestId('player-controls-tracker-disclosure')).not.toHaveAttribute('open');
    expect(screen.getByTestId('player-controls-tracker-summary')).toHaveTextContent('HP: 20');
    expect(screen.getByTestId('player-controls-tracker-summary')).toHaveTextContent('PP: 0/0');
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
