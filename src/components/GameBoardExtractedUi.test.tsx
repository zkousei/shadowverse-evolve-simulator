import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardAttackLineOverlay from './GameBoardAttackLineOverlay';
import GameBoardAttackModeBanner from './GameBoardAttackModeBanner';
import GameBoardCardInspector from './GameBoardCardInspector';
import GameBoardDialogsHost from './GameBoardDialogsHost';
import GameBoardCoinMessageOverlay from './GameBoardCoinMessageOverlay';
import GameBoardDiceOverlay from './GameBoardDiceOverlay';
import GameBoardEvolveAutoAttachDialog from './GameBoardEvolveAutoAttachDialog';
import GameBoardEndTurnButton from './GameBoardEndTurnButton';
import GameBoardGlobalOverlays from './GameBoardGlobalOverlays';
import GameBoardLeaderZone from './GameBoardLeaderZone';
import GameBoardMulliganButton from './GameBoardMulliganButton';
import GameBoardMulliganDialog from './GameBoardMulliganDialog';
import GameBoardPreparationControls from './GameBoardPreparationControls';
import GameBoardPreparationPanel from './GameBoardPreparationPanel';
import GameBoardPreparationReadyStatus from './GameBoardPreparationReadyStatus';
import GameBoardPlayingControls from './GameBoardPlayingControls';
import GameBoardPlayerTracker from './GameBoardPlayerTracker';
import GameBoardReadOnlyStatusPanel from './GameBoardReadOnlyStatusPanel';
import GameBoardRecentEventsPanel from './GameBoardRecentEventsPanel';
import GameBoardReconnectAlert from './GameBoardReconnectAlert';
import GameBoardRevealedCardsOverlay from './GameBoardRevealedCardsOverlay';
import GameBoardResetDialog from './GameBoardResetDialog';
import GameBoardRoomStatus from './GameBoardRoomStatus';
import GameBoardSavedDeckPickerDialog from './GameBoardSavedDeckPickerDialog';
import GameBoardSavedSessionPrompt from './GameBoardSavedSessionPrompt';
import GameBoardTopNDialog from './GameBoardTopNDialog';
import GameBoardTokenSpawnDialog from './GameBoardTokenSpawnDialog';
import GameBoardTransientMessage from './GameBoardTransientMessage';
import GameBoardTurnPanel from './GameBoardTurnPanel';
import GameBoardZoneSearchButton from './GameBoardZoneSearchButton';
import GameBoardZoneActionsMenu from './GameBoardZoneActionsMenu';

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

  it('renders zone search button and wires click action', () => {
    const onClick = vi.fn();

    render(
      <GameBoardZoneSearchButton
        label="Search"
        onClick={onClick}
        title="Unavailable"
        isInteractive={false}
      />
    );

    const button = screen.getByRole('button', { name: 'Search' });

    expect(button).toHaveAttribute('title', 'Unavailable');
    expect(button).toHaveStyle({ cursor: 'not-allowed' });

    fireEvent.click(button);

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

  it('renders global overlays host with active overlays', () => {
    render(
      <GameBoardGlobalOverlays
        coinMessage="Host goes first!"
        turnMessage="YOUR TURN"
        cardPlayMessage="Alpha Knight was played."
        attackMessage="Alpha Knight attacks."
        attackLine={{ sourcePoint: { x: 10, y: 20 }, targetPoint: { x: 100, y: 120 } }}
        revealedCardsOverlay={{
          title: 'Revealed Cards',
          cards: [{ cardId: 'TEST-001', name: 'Alpha Knight', image: '/alpha.png' }],
          summaryLines: ['1 card revealed'],
        }}
        cardDetailLookup={{
          'TEST-001': {
            id: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha.png',
          },
        }}
        isRollingDice={true}
        diceValue={6}
      />
    );

    expect(screen.getByText('Host goes first!')).toBeInTheDocument();
    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight was played.')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight attacks.')).toBeInTheDocument();
    expect(screen.getByText('Revealed Cards')).toBeInTheDocument();
    expect(screen.getByText('1 card revealed')).toBeInTheDocument();
    expect(screen.getAllByRole('status').some((element) => element.textContent?.includes('6'))).toBe(true);
  });

  it('renders dialogs host with saved deck picker and evolve attach dialog', () => {
    render(
      <GameBoardDialogsHost
        savedDeckPicker={{
          targetLabel: 'Player 1',
          savedDeckSearch: '',
          filteredSavedDeckOptions: [],
          onBackdropClick: vi.fn(),
          onClose: vi.fn(),
          onSearchChange: vi.fn(),
          onLoadDeck: vi.fn(),
        }}
        evolveAutoAttach={{
          selection: {
            sourceCard: {
              id: 'source-1',
              cardId: 'TEST-EVO',
              name: 'Evolved Knight',
              image: '/evo.png',
              zone: 'field-host',
              owner: 'host',
              isTapped: false,
              isFlipped: false,
              counters: { atk: 0, hp: 0 },
              genericCounter: 0,
              baseCardType: 'follower',
              cardKindNormalized: 'follower',
            },
            candidateCards: [
              {
                id: 'candidate-1',
                cardId: 'TEST-001',
                name: 'Alpha Knight',
                image: '/alpha.png',
                zone: 'field-host',
                owner: 'host',
                isTapped: false,
                isFlipped: false,
                counters: { atk: 0, hp: 0 },
                genericCounter: 0,
                baseCardType: 'follower',
                cardKindNormalized: 'follower',
              },
            ],
          },
          cardDetailLookup: {
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
            'TEST-EVO': {
              id: 'TEST-EVO',
              name: 'Evolved Knight',
              image: '/evo.png',
              className: 'Royal',
              title: 'Hero Tale',
              type: 'Follower',
              subtype: 'Soldier',
              cost: '4',
              atk: 4,
              hp: 4,
              abilityText: '',
            },
          },
          onBackdropClick: vi.fn(),
          onCancel: vi.fn(),
          onConfirm: vi.fn(),
        }}
      />
    );

    expect(screen.getByTestId('saved-deck-picker-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('evolve-auto-attach-backdrop')).toBeInTheDocument();
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

  it('renders card inspector and wires close action', () => {
    const onClose = vi.fn();

    render(
      <GameBoardCardInspector
        selectedInspectorCard={{
          id: 'card-1',
          cardId: 'TEST-001',
          name: 'Alpha Knight',
          image: '/alpha.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
          baseCardType: 'follower',
          cardKindNormalized: 'follower',
        }}
        selectedInspectorDetail={{
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
          abilityText: '[Fanfare] Test ability.',
        }}
        inspectorPresentation={{
          primaryMeta: 'Royal / Hero Tale',
          secondaryMeta: 'Follower / Soldier',
          stats: '2 / 2',
        }}
        inspectorPopoverStyle={{ position: 'fixed', top: 40, left: 40 }}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('card-inspector')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Royal / Hero Tale')).toBeInTheDocument();
    expect(screen.getByText('Follower / Soldier')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders end turn button and wires click/disabled state', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <GameBoardEndTurnButton
        label="Player 1"
        background="#f59e0b"
        isEnabled={true}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'End Player 1 Turn' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <GameBoardEndTurnButton
        label="Player 1"
        background="#f59e0b"
        isEnabled={false}
        disabledTitle="Available during your turn only."
        onClick={onClick}
      />
    );

    expect(screen.getByRole('button', { name: 'End Player 1 Turn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'End Player 1 Turn' })).toHaveAttribute('title', 'Available during your turn only.');
  });

  it('renders read-only status panel values', () => {
    render(
      <GameBoardReadOnlyStatusPanel
        label="Opponent"
        hp={18}
        pp={3}
        maxPp={5}
        ep={2}
        sep={1}
        combo={4}
      />
    );

    expect(screen.getByText('Opponent Status')).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === '3 / 5')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders player tracker values and wires stat adjustments', () => {
    const onAdjustStat = vi.fn();

    render(
      <GameBoardPlayerTracker
        testId="player-tracker-host"
        label="Player 1"
        hp={20}
        ep={3}
        sep={1}
        combo={0}
        pp={2}
        maxPp={5}
        onAdjustStat={onAdjustStat}
      />
    );

    const tracker = screen.getByTestId('player-tracker-host');
    expect(within(tracker).getByText('Player 1 Status')).toBeInTheDocument();
    expect(tracker).toHaveTextContent('2/5');

    fireEvent.click(screen.getByTestId('player-tracker-host-hp-increase'));
    fireEvent.click(screen.getByTestId('player-tracker-host-ep-decrease'));
    fireEvent.click(screen.getByTestId('player-tracker-host-maxPp-increase'));
    fireEvent.click(screen.getByTestId('player-tracker-host-pp-decrease'));

    expect(onAdjustStat).toHaveBeenCalledWith('hp', 1);
    expect(onAdjustStat).toHaveBeenCalledWith('ep', -1);
    expect(onAdjustStat).toHaveBeenCalledWith('maxPp', 1);
    expect(onAdjustStat).toHaveBeenCalledWith('pp', -1);
  });

  it('renders zone actions menu and delegates toggle and action clicks', () => {
    const searchAction = vi.fn();
    const onToggle = vi.fn();
    const onActionClick = vi.fn((action: () => void) => action());

    render(
      <GameBoardZoneActionsMenu
        actionsLabel="Actions"
        isOpen={true}
        actions={[
          { label: 'Search', onClick: searchAction },
          { label: 'Look Top', onClick: vi.fn(), tone: 'accent' },
        ]}
        onToggle={onToggle}
        onActionClick={onActionClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(searchAction).toHaveBeenCalledTimes(1);
  });

  it('renders leader zone and wires the search button', () => {
    const onSearch = vi.fn();

    render(
      <GameBoardLeaderZone
        leaderZoneId="leader-host"
        label="Player 1"
        zoneLabel="Player 1 Leader"
        leaderCards={[
          { id: 'leader-1', cardId: 'TEST-LEADER-1', name: 'Leader A' } as never,
          { id: 'leader-2', cardId: 'TEST-LEADER-2', name: 'Leader B' } as never,
        ]}
        side="left"
        sideZoneWidth={140}
        cardDetailLookup={{}}
        isAttackTargetLeader={false}
        searchLabel="Search"
        onSearch={onSearch}
      />
    );

    expect(screen.getByTestId('leader-zone-leader-host')).toBeInTheDocument();
    expect(screen.getByTestId('zone-leader-host')).toHaveTextContent('Player 1 Leader');

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 leader search' }));

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('renders attack line overlay with source and target coordinates', () => {
    const { container } = render(
      <GameBoardAttackLineOverlay
        sourcePoint={{ x: 10, y: 20 }}
        targetPoint={{ x: 110, y: 220 }}
      />
    );

    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    expect(line).toHaveAttribute('x1', '10');
    expect(line).toHaveAttribute('y1', '20');
    expect(line).toHaveAttribute('x2', '110');
    expect(line).toHaveAttribute('y2', '220');
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

  it('renders saved deck picker dialog and wires close, search, load, and backdrop', () => {
    const onBackdropClick = vi.fn();
    const onClose = vi.fn();
    const onSearchChange = vi.fn();
    const onLoadDeck = vi.fn();
    const option = {
      deck: {
        id: 'deck-1',
        name: 'Alpha Deck',
        savedAt: '2026-04-05T00:00:00.000Z',
        deckState: {
          mainDeck: [],
          evolveDeck: [],
          leaderCards: [],
          tokenDeck: [],
        },
        ruleConfig: {
          format: 'other',
          identityType: 'class',
          selectedClass: null,
          selectedTitle: null,
          selectedClasses: [null, null],
        },
      },
      summary: 'Royal / Hero Tale',
      counts: 'Main 40 / Evolve 10 / Leader 1',
      deckData: {
        mainDeck: [],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    };

    render(
      <GameBoardSavedDeckPickerDialog
        targetLabel="My"
        savedDeckSearch="alpha"
        filteredSavedDeckOptions={[option]}
        onBackdropClick={onBackdropClick}
        onClose={onClose}
        onSearchChange={onSearchChange}
        onLoadDeck={onLoadDeck}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Load from My Decks' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('saved-deck-picker-backdrop'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search saved decks' }), { target: { value: 'beta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    expect(onBackdropClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('beta');
    expect(onLoadDeck).toHaveBeenCalledWith(option);
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

  it('renders token spawn dialog and wires destination, count, cancel, and confirm', () => {
    const onDestinationChange = vi.fn();
    const onCountChange = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardTokenSpawnDialog
        tokenSpawnOptions={[
          {
            cardId: 'TOKEN-001',
            name: 'Knight Token',
            image: '/token.png',
            baseCardType: 'follower',
          },
        ]}
        tokenSpawnCounts={{ 'TOKEN-001': 1 }}
        tokenSpawnDestination="ex"
        totalTokenSpawnCount={1}
        cardDetailLookup={{
          'TOKEN-001': {
            id: 'TOKEN-001',
            name: 'Knight Token',
            image: '/token.png',
            className: 'Royal',
            title: 'Hero Tale',
            type: 'Follower',
            subtype: 'Token',
            cost: '1',
            atk: 1,
            hp: 1,
            abilityText: '',
          },
        }}
        onDestinationChange={onDestinationChange}
        onCountChange={onCountChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Generate Tokens' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Field' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Knight Token count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Knight Token count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(onDestinationChange).toHaveBeenCalledWith('field');
    expect(onCountChange).toHaveBeenCalledWith('TOKEN-001', 1);
    expect(onCountChange).toHaveBeenCalledWith('TOKEN-001', -1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders evolve auto attach dialog and wires cancel, confirm, and backdrop', () => {
    const onBackdropClick = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardEvolveAutoAttachDialog
        sourceCard={{
          id: 'evolve-1',
          cardId: 'EVOLVE-001',
          name: 'Evolved Alpha',
          image: '/evolve.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
          baseCardType: 'follower',
          cardKindNormalized: 'evolve',
          isEvolveCard: true,
        }}
        candidateCards={[
          {
            id: 'candidate-1',
            cardId: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha.png',
            zone: 'field-host',
            owner: 'host',
            isTapped: false,
            isFlipped: false,
            counters: { atk: 0, hp: 0 },
            genericCounter: 0,
            baseCardType: 'follower',
            cardKindNormalized: 'follower',
          },
        ]}
        cardDetailLookup={{
          'EVOLVE-001': {
            id: 'EVOLVE-001',
            name: 'Evolved Alpha',
            image: '/evolve.png',
            className: 'Royal',
            title: 'Hero Tale',
            type: 'Follower',
            subtype: 'Evolve',
            cost: '4',
            atk: 4,
            hp: 4,
            abilityText: '',
          },
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
            abilityText: '',
          },
        }}
        onBackdropClick={onBackdropClick}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Choose Target Card' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('evolve-auto-attach-backdrop'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: /Alpha Knight.*TEST-001/ }));

    expect(onBackdropClick).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('candidate-1');
  });
});
