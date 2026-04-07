import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardEndTurnButton from './GameBoardEndTurnButton';
import GameBoardEndTurnSection from './GameBoardEndTurnSection';
import GameBoardLeaderZone from './GameBoardLeaderZone';
import GameBoardLeaderZoneSection from './GameBoardLeaderZoneSection';
import GameBoardPlayerTracker from './GameBoardPlayerTracker';
import GameBoardPlayerTrackerSection from './GameBoardPlayerTrackerSection';
import GameBoardReadOnlyStatusPanel from './GameBoardReadOnlyStatusPanel';
import GameBoardReadOnlyStatusSection from './GameBoardReadOnlyStatusSection';
import GameBoardSearchableZoneStack from './GameBoardSearchableZoneStack';
import GameBoardTurnPanel from './GameBoardTurnPanel';
import GameBoardZoneActionsMenu from './GameBoardZoneActionsMenu';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';
import GameBoardZoneSearchButton from './GameBoardZoneSearchButton';

vi.mock('./CardArtwork', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('./Zone', () => ({
  default: ({
    id,
    label,
    cards,
    containerStyle,
  }: {
    id: string;
    label: string;
    cards: Array<{ id: string }>;
    containerStyle?: React.CSSProperties;
  }) => (
    <section data-testid={`zone-${id}`} data-border={containerStyle?.border ?? ''}>
      <h3>{label}</h3>
      <span>{cards.length} cards</span>
    </section>
  ),
}));

describe('GameBoard extracted UI components - zones and controls', () => {
  it('renders leader zone section and wires search action', () => {
    const onSearch = vi.fn();

    render(
      <GameBoardLeaderZoneSection
        playerRole="host"
        label="Player 1"
        zoneLabel="Player 1 Leader"
        side="left"
        leaderCards={[
          {
            id: 'leader-1',
            cardId: 'TEST-LEADER',
            name: 'Leader Alice',
            image: '/leader.png',
            zone: 'leader-host',
            owner: 'host',
            isTapped: false,
            isFlipped: false,
            counters: { atk: 0, hp: 0 },
            genericCounter: 0,
            baseCardType: null,
            cardKindNormalized: 'leader',
            isLeaderCard: true,
          },
          {
            id: 'leader-2',
            cardId: 'TEST-LEADER-2',
            name: 'Leader Bob',
            image: '/leader-b.png',
            zone: 'leader-host',
            owner: 'host',
            isTapped: false,
            isFlipped: false,
            counters: { atk: 0, hp: 0 },
            genericCounter: 0,
            baseCardType: null,
            cardKindNormalized: 'leader',
            isLeaderCard: true,
          },
        ]}
        sideZoneWidth={120}
        cardDetailLookup={{}}
        viewerRole="host"
        attackSourceController="guest"
        searchLabel="Search"
        onSearch={onSearch}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 leader search' }));

    expect(onSearch).toHaveBeenCalledWith('leader-host', 'Player 1 Leader');
  });

  it('uses attack source controller when highlighting leader targets', () => {
    render(
      <GameBoardLeaderZoneSection
        playerRole="host"
        label="Player 1"
        zoneLabel="Player 1 Leader"
        side="left"
        leaderCards={[]}
        sideZoneWidth={120}
        cardDetailLookup={{}}
        viewerRole="host"
        attackSourceController="host"
        searchLabel="Search"
        onSearch={vi.fn()}
      />
    );

    expect(screen.getByTestId('zone-leader-host')).toHaveAttribute('data-border', '');
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

  it('renders searchable zone stack and wires search action', () => {
    const onSearch = vi.fn();

    render(
      <GameBoardSearchableZoneStack
        zone={<div data-testid="mock-zone">Zone Content</div>}
        searchLabel="Search"
        onSearch={onSearch}
        searchTitle="Search this zone"
        isSearchInteractive={false}
      />
    );

    expect(screen.getByTestId('mock-zone')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toHaveAttribute('title', 'Search this zone');

    fireEvent.click(button);

    expect(onSearch).toHaveBeenCalledTimes(1);
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

  it('renders player tracker section from player state', () => {
    const onAdjustStat = vi.fn();

    render(
      <GameBoardPlayerTrackerSection
        testId="player-tracker-host"
        label="Player 1"
        playerState={{
          hp: 20,
          pp: 2,
          maxPp: 5,
          ep: 3,
          sep: 1,
          combo: 0,
          initialHandDrawn: false,
          mulliganUsed: false,
          isReady: false,
        }}
        onAdjustStat={onAdjustStat}
      />
    );

    fireEvent.click(screen.getByTestId('player-tracker-host-hp-increase'));

    expect(screen.getByText('Player 1 Status')).toBeInTheDocument();
    expect(onAdjustStat).toHaveBeenCalledWith('hp', 1);
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

  it('renders zone actions section and delegates open and close behavior', () => {
    const searchAction = vi.fn();
    const onActiveMenuChange = vi.fn();

    const { rerender } = render(
      <GameBoardZoneActionsSection
        menuId="mainDeck-host"
        activeMenuId={null}
        actionsLabel="Actions"
        actions={[
          { label: 'Search', onClick: searchAction },
        ]}
        onActiveMenuChange={onActiveMenuChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    expect(onActiveMenuChange).toHaveBeenCalledWith('mainDeck-host');

    rerender(
      <GameBoardZoneActionsSection
        menuId="mainDeck-host"
        activeMenuId="mainDeck-host"
        actionsLabel="Actions"
        actions={[
          { label: 'Search', onClick: searchAction },
        ]}
        onActiveMenuChange={onActiveMenuChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(searchAction).toHaveBeenCalledTimes(1);
    expect(onActiveMenuChange).toHaveBeenCalledWith(null);
  });

  it('renders end turn section and delegates end turn for the active player', () => {
    const onEndTurn = vi.fn();

    render(
      <GameBoardEndTurnSection
        playerRole="host"
        label="Player 1"
        background="#f59e0b"
        turnPlayer="host"
        gameStatus="playing"
        canInteract={true}
        disabledTitle="Blocked"
        onEndTurn={onEndTurn}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'End Player 1 Turn' }));

    expect(onEndTurn).toHaveBeenCalledWith('host');
  });

  it('renders read only status section from player state', () => {
    render(
      <GameBoardReadOnlyStatusSection
        label="Player 1"
        playerState={{
          hp: 20,
          pp: 2,
          maxPp: 5,
          ep: 3,
          sep: 1,
          combo: 0,
          initialHandDrawn: false,
          mulliganUsed: false,
          isReady: false,
        }}
      />
    );

    expect(screen.getByText('Player 1 Status')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === '2 / 5')).toBeInTheDocument();
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
});
