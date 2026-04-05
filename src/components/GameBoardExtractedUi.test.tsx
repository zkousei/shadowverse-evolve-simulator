import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardAttackModeBanner from './GameBoardAttackModeBanner';
import GameBoardCoinMessageOverlay from './GameBoardCoinMessageOverlay';
import GameBoardDiceOverlay from './GameBoardDiceOverlay';
import GameBoardPreparationPanel from './GameBoardPreparationPanel';
import GameBoardRecentEventsPanel from './GameBoardRecentEventsPanel';
import GameBoardReconnectAlert from './GameBoardReconnectAlert';
import GameBoardRevealedCardsOverlay from './GameBoardRevealedCardsOverlay';
import GameBoardResetDialog from './GameBoardResetDialog';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardSavedSessionPrompt from './GameBoardSavedSessionPrompt';
import GameBoardTopNDialog from './GameBoardTopNDialog';
import GameBoardTransientMessage from './GameBoardTransientMessage';
import GameBoardTurnPanel from './GameBoardTurnPanel';

vi.mock('./CardArtwork', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
import GameBoardUndoTurnDialog from './GameBoardUndoTurnDialog';

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

  it('renders dice overlay with current value', () => {
    render(<GameBoardDiceOverlay value={6} />);

    expect(screen.getByRole('status')).toHaveTextContent('6');
  });

  it('renders coin message overlay text', () => {
    render(<GameBoardCoinMessageOverlay message="Host goes first!" />);

    expect(screen.getByRole('status')).toHaveTextContent('Host goes first!');
  });

  it('renders revealed cards overlay with summary lines', () => {
    render(
      <GameBoardRevealedCardsOverlay
        overlay={{
          title: 'Look at Top 3 Cards',
          cards: [
            { cardId: 'TEST-001', name: 'Alpha Knight', image: '/alpha.png' },
          ],
          summaryLines: ['1 to hand', '2 to bottom'],
        }}
        cardDetailLookup={{
          'TEST-001': {
            id: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha-detail.png',
            className: 'Royal',
            title: 'Hero Tale',
            type: 'Follower',
            subtype: 'Soldier',
            cost: '2',
            atk: 2,
            hp: 2,
            abilityText: '',
          },
        }}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Look at Top 3 Cards');
    expect(screen.getByRole('img', { name: 'Alpha Knight' })).toBeInTheDocument();
    expect(screen.getByText('1 to hand')).toBeInTheDocument();
    expect(screen.getByText('2 to bottom')).toBeInTheDocument();
  });

  it('renders transient messages for turn, card play, and attack tones', () => {
    const { rerender } = render(
      <GameBoardTransientMessage
        message="YOUR TURN"
        tone="turn"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('YOUR TURN');

    rerender(
      <GameBoardTransientMessage
        message="Alpha Knight was played."
        tone="card-play"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Alpha Knight was played.');

    rerender(
      <GameBoardTransientMessage
        message="Alpha Knight attacks!"
        tone="attack"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Alpha Knight attacks!');
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

  it('renders undo turn dialog and wires cancel/confirm actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardUndoTurnDialog
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Undo Last End Turn' })).toBeInTheDocument();
    expect(screen.getByText('This will rewind the board state to just before you ended your turn. Do you want to proceed?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Undo' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders reset game dialog and wires cancel/confirm actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardResetDialog
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Reset Game' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to reset the game to its initial state? All cards will return to their starting decks.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders top-n dialog and wires value, cancel, and confirm', () => {
    const onValueChange = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardTopNDialog
        value={3}
        onValueChange={onValueChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'How many cards to look at?' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'How many cards to look at?' }), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
