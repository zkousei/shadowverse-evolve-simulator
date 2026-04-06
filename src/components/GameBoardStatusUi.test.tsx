import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardAttackModeBanner from './GameBoardAttackModeBanner';
import GameBoardMulliganButton from './GameBoardMulliganButton';
import GameBoardMulliganDialog from './GameBoardMulliganDialog';
import GameBoardPlayingControls from './GameBoardPlayingControls';
import GameBoardPreparationControls from './GameBoardPreparationControls';
import GameBoardPreparationPanel from './GameBoardPreparationPanel';
import GameBoardPreparationReadyStatus from './GameBoardPreparationReadyStatus';
import GameBoardRecentEventsPanel from './GameBoardRecentEventsPanel';
import GameBoardReconnectAlert from './GameBoardReconnectAlert';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardSavedSessionPrompt from './GameBoardSavedSessionPrompt';

vi.mock('./CardArtwork', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('./Zone', () => ({
  default: ({
    id,
    label,
    cards,
  }: {
    id: string;
    label: string;
    cards: Array<{ id: string }>;
  }) => (
    <section data-testid={`zone-${id}`}>
      <h3>{label}</h3>
      <span>{cards.length} cards</span>
    </section>
  ),
}));

describe('GameBoard extracted UI components - status and preparation', () => {
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

  it('renders mulligan dialog and wires selection, cancel, and confirm', () => {
    const onSelectCard = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardMulliganDialog
        isOpen={true}
        title="Mulligan: Select Return Order"
        instructions="Select cards"
        disclaimer="Cards are returned in this order."
        cards={[
          {
            id: 'card-1',
            cardId: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha.png',
            zone: 'hand-host',
            owner: 'host',
            isTapped: false,
            isFlipped: false,
            counters: { atk: 0, hp: 0 },
            genericCounter: 0,
            baseCardType: 'follower',
            cardKindNormalized: 'follower',
          },
        ]}
        mulliganOrder={['card-1', 'card-2', 'card-3', 'card-4']}
        cardDetailLookup={{
          'TEST-001': {
            id: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha.png',
            className: 'Royal',
            title: 'Hero Tale',
            type: 'Follower',
            subtype: 'Soldier',
            cost: '2',
            atk: 2,
            hp: 2,
            abilityText: '[Fanfare] Test ability.',
          },
        }}
        cancelLabel="Cancel"
        confirmLabel="Exchange"
        onSelectCard={onSelectCard}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Mulligan: Select Return Order' })).toBeInTheDocument();

    fireEvent.click(screen.getByAltText('Alpha Knight'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exchange' }));

    expect(onSelectCard).toHaveBeenCalledWith('card-1');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders mulligan button and wires click action', () => {
    const onClick = vi.fn();

    render(
      <GameBoardMulliganButton
        label="Mulligan (Player 1)"
        onClick={onClick}
        style={{ background: '#eab308', color: 'black' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mulligan (Player 1)' }));

    expect(onClick).toHaveBeenCalledTimes(1);
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

  it('renders preparation ready status labels for solo mode', () => {
    render(
      <GameBoardPreparationReadyStatus
        isSoloMode={true}
        hostInitialHandDrawn={true}
        guestInitialHandDrawn={false}
        hostReady={false}
        guestReady={true}
      />
    );

    const hostStatus = screen.getByTestId('preparation-ready-status-host');
    const guestStatus = screen.getByTestId('preparation-ready-status-guest');

    expect(hostStatus).toHaveTextContent('PLAYER 1');
    expect(hostStatus).toHaveTextContent('DECIDING');
    expect(guestStatus).toHaveTextContent('PLAYER 2');
    expect(guestStatus).toHaveTextContent('READY');
  });

  it('renders preparation controls and wires solo handlers', () => {
    const onSetInitialTurnOrder = vi.fn();
    const onDrawInitialHand = vi.fn();
    const onToggleReady = vi.fn();
    const onStartGame = vi.fn();

    render(
      <GameBoardPreparationControls
        isSoloMode={true}
        isHost={true}
        topRole="guest"
        bottomRole="host"
        bottomInitialHandDrawn={true}
        bottomReady={false}
        topInitialHandDrawn={true}
        topReady={true}
        hostInitialHandDrawn={true}
        guestInitialHandDrawn={true}
        hostReady={true}
        guestReady={true}
        onSetInitialTurnOrder={onSetInitialTurnOrder}
        onDrawInitialHand={onDrawInitialHand}
        onToggleReady={onToggleReady}
        onStartGame={onStartGame}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 1st' }));
    fireEvent.click(screen.getByRole('button', { name: '✅ Player 1 Ready' }));
    fireEvent.click(screen.getByRole('button', { name: '✕ Cancel P2 Ready' }));
    fireEvent.click(screen.getByRole('button', { name: '▶ START GAME' }));

    expect(onSetInitialTurnOrder).toHaveBeenCalledWith('host');
    expect(onToggleReady).toHaveBeenCalledWith('host');
    expect(onToggleReady).toHaveBeenCalledWith('guest');
    expect(onStartGame).toHaveBeenCalledTimes(1);
    expect(onDrawInitialHand).not.toHaveBeenCalled();
  });

  it('renders playing controls and wires coin, dice, and undo actions', () => {
    const onTossCoin = vi.fn();
    const onRollDice = vi.fn();
    const onOpenUndo = vi.fn();

    render(
      <GameBoardPlayingControls
        canShowUndoTurn={true}
        onTossCoin={onTossCoin}
        onRollDice={onRollDice}
        onOpenUndo={onOpenUndo}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '🪙 Toss Coin' }));
    fireEvent.click(screen.getByRole('button', { name: '🎲 Roll Dice' }));
    fireEvent.click(screen.getByRole('button', { name: '↺ UNDO LAST END TURN' }));

    expect(onTossCoin).toHaveBeenCalledTimes(1);
    expect(onRollDice).toHaveBeenCalledTimes(1);
    expect(onOpenUndo).toHaveBeenCalledTimes(1);
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

  it('renders reconnect alert message', () => {
    render(<GameBoardReconnectAlert />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reconnecting to host. Actions are temporarily locked until the latest state is synced.'
    );
  });
});
