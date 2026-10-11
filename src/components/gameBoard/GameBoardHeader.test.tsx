import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import GameBoardHeader from './GameBoardHeader';
import GameBoardInputProfileProvider from '../../contexts/GameBoardInputProfileProvider';
import { initialState } from '../../types/game';

it.each(['fine', 'coarse'] as const)('keeps 100 log entries accessible in a bounded dropdown on %s input', profile => {
  const noop = vi.fn();
  const eventHistory = Array.from({ length: 100 }, (_, index) => `Event ${100 - index}: ${'Long log line '.repeat(10).trim()}`);
  render(
    <GameBoardInputProfileProvider value={profile}>
      <GameBoardHeader
        isTabletLayout={profile === 'coarse'} room="" isSoloMode={true} isHost={true}
        isSpectator={false} role="host" status="" connectionState="connected"
        spectatorCount={0} maxSpectatorConnections={8}
        connectionBadgeTone={{ label: 'Connected', background: '', color: '', border: '' }}
        isRoomCopied={false} gameState={{ ...initialState, gameStatus: 'playing' }}
        topRole="guest" bottomRole="host" currentTurnLabel="Player 1"
        isBottomTurnActive={true} canShowUndoTurn={false}
        onCopyRoomId={noop} onReconnect={noop} onSetInitialTurnOrder={noop}
        onDrawInitialHand={noop} onToggleReady={noop} onStartGame={noop}
        onTossCoin={noop} onRollDice={noop} onOpenUndo={noop} onPhaseChange={noop}
        eventHistory={eventHistory}
      />
    </GameBoardInputProfileProvider>,
  );
  const trigger = screen.getByTestId('gameboard-recent-events-trigger');
  const panel = screen.getByTestId('gameboard-recent-events');
  expect(trigger).toHaveTextContent('100');
  expect(panel).toHaveStyle({ position: 'absolute', maxHeight: '0px', pointerEvents: 'none' });
  fireEvent.click(trigger);
  expect(panel).toHaveStyle({ position: 'absolute', maxHeight: '260px', overflowY: 'auto' });
  const latest = within(panel).getByText(eventHistory[0]);
  const oldest = within(panel).getByText(eventHistory[99]);
  expect(latest.parentElement?.children).toHaveLength(100);
  expect(latest.parentElement).toHaveStyle({ maxHeight: '200px', overflowY: 'auto' });
  expect(oldest).toBeInTheDocument();
  expect(latest).toHaveStyle({ wordBreak: 'break-word' });
  fireEvent.click(within(panel).getByRole('button', { name: '✕' }));
  expect(panel).toHaveStyle({ maxHeight: '0px', pointerEvents: 'none' });
  fireEvent.click(trigger);
  expect(within(panel).getByText(eventHistory[99])).toBeInTheDocument();
});
