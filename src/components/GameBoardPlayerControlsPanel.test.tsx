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
      return key;
    },
  }),
}));

vi.mock('./GameBoardPlayerTrackerSection', () => ({
  default: ({ testId }: { testId: string }) => (
    <div data-testid={testId}>Tracker</div>
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
});
