import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardAttackModeBanner from './GameBoardAttackModeBanner';
import GameBoardPreparationPanel from './GameBoardPreparationPanel';
import GameBoardRecentEventsPanel from './GameBoardRecentEventsPanel';
import GameBoardReconnectAlert from './GameBoardReconnectAlert';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardSavedSessionPrompt from './GameBoardSavedSessionPrompt';
import GameBoardTurnPanel from './GameBoardTurnPanel';

describe('GameBoard extracted UI components', () => {
  it('renders room status in multiplayer and wires copy action', () => {
    const onCopyRoomId = vi.fn();

    render(
      <GameBoardRoomStatus
        room="ROOM123"
        isSoloMode={false}
        isHost={true}
        status="Connected! Waiting for guest..."
        connectionState="connected"
        connectionBadgeTone={{
          label: 'Connected',
          background: 'rgba(16, 185, 129, 0.16)',
          border: 'rgba(16, 185, 129, 0.4)',
          color: '#d1fae5',
        }}
        isRoomCopied={false}
        onCopyRoomId={onCopyRoomId}
        onReconnect={vi.fn()}
      />
    );

    expect(screen.getByText('Room:')).toBeInTheDocument();
    expect(screen.getByText('ROOM123')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Connected! Waiting for guest...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(onCopyRoomId).toHaveBeenCalledTimes(1);
  });

  it('renders reconnect action for disconnected guest state', () => {
    const onReconnect = vi.fn();

    render(
      <GameBoardRoomStatus
        room="ROOM123"
        isSoloMode={false}
        isHost={false}
        status="Disconnected"
        connectionState="reconnecting"
        connectionBadgeTone={{
          label: 'Reconnecting',
          background: 'rgba(245, 158, 11, 0.16)',
          border: 'rgba(245, 158, 11, 0.4)',
          color: '#fde68a',
        }}
        isRoomCopied={true}
        onCopyRoomId={vi.fn()}
        onReconnect={onReconnect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Now' }));

    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('renders saved session prompt and wires discard/resume actions', () => {
    const onDiscard = vi.fn();
    const onResume = vi.fn();

    render(
      <GameBoardSavedSessionPrompt
        savedSessionTimestamp="4/4/2026, 9:00:00 AM"
        onDiscard={onDiscard}
        onResume={onResume}
      />
    );

    expect(screen.getByText('Previous host session found for this room.')).toBeInTheDocument();
    expect(screen.getByText('You can restore the state from 4/4/2026, 9:00:00 AM.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resume Previous Session' }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('renders attack mode banner and wires cancel action', () => {
    const onCancel = vi.fn();

    render(
      <GameBoardAttackModeBanner
        attackerName="Alpha Knight"
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('ATTACK MODE')).toBeInTheDocument();
    expect(screen.getByText((_, node) => (
      node?.textContent === 'Select an enemy follower or leader for Alpha Knight.'
    ))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders preparation panel and toggles reveal hands mode', () => {
    const onToggleRevealHandsMode = vi.fn();

    render(
      <GameBoardPreparationPanel
        isSoloMode={false}
        isHost={true}
        hostInitialHandDrawn={true}
        guestInitialHandDrawn={false}
        hostReady={true}
        guestReady={false}
        revealHandsMode={false}
        onToggleRevealHandsMode={onToggleRevealHandsMode}
      />
    );

    expect(screen.getByText('Preparing Game')).toBeInTheDocument();
    expect(screen.getByText('1. Draw Opening Hands')).toBeInTheDocument();
    expect(screen.getByText('Reveal Hands Mode')).toBeInTheDocument();
    expect(screen.getAllByText(/Opening Hand:/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'OFF' }));

    expect(onToggleRevealHandsMode).toHaveBeenCalledTimes(1);
  });

  it('renders recent events in order', () => {
    render(
      <GameBoardRecentEventsPanel
        eventHistory={[
          'Host drew a card.',
          'Guest evolved Alpha Knight.',
        ]}
      />
    );

    expect(screen.getByText('Recent Events')).toBeInTheDocument();
    expect(screen.getByText('Host drew a card.')).toBeInTheDocument();
    expect(screen.getByText('Guest evolved Alpha Knight.')).toBeInTheDocument();
  });

  it('renders turn panel and wires phase changes', () => {
    const onPhaseChange = vi.fn();

    render(
      <GameBoardTurnPanel
        isSoloMode={false}
        isCurrentPlayerTurn={true}
        currentTurnLabel="Self"
        turnCount={3}
        phase="Main"
        isBottomTurnActive={true}
        canChangePhase={true}
        onPhaseChange={onPhaseChange}
      />
    );

    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    expect(screen.getByText('TURN 3')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Phase' }), { target: { value: 'End' } });

    expect(onPhaseChange).toHaveBeenCalledWith('End');
  });

  it('renders reconnect alert message', () => {
    render(<GameBoardReconnectAlert />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reconnecting to host. Actions are temporarily locked until the latest state is synced.'
    );
  });
});
