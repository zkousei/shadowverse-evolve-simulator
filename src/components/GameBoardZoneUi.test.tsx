import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardEndTurnButton from './GameBoardEndTurnButton';
import GameBoardEndTurnSection from './GameBoardEndTurnSection';
import GameBoardBoardRow from './GameBoardBoardRow';
import GameBoardHandRow from './GameBoardHandRow';
import GameBoardLeaderZone from './GameBoardLeaderZone';
import GameBoardLeaderZoneSection from './GameBoardLeaderZoneSection';
import GameBoardPlayerTracker from './GameBoardPlayerTracker';
import GameBoardPlayerTrackerSection from './GameBoardPlayerTrackerSection';
import GameBoardReadOnlyStatusPanel from './GameBoardReadOnlyStatusPanel';
import GameBoardReadOnlyStatusSection from './GameBoardReadOnlyStatusSection';
import GameBoardMainDeckSection from './GameBoardMainDeckSection';
import GameBoardSearchableStackSection from './GameBoardSearchableStackSection';
import GameBoardSearchableZoneStack from './GameBoardSearchableZoneStack';
import GameBoardTurnPanel from './GameBoardTurnPanel';
import GameBoardZoneActionsMenu from './GameBoardZoneActionsMenu';
import GameBoardZoneActionsSection from './GameBoardZoneActionsSection';
import GameBoardZoneSearchButton from './GameBoardZoneSearchButton';
import GameBoardInputProfileProvider from '../contexts/GameBoardInputProfileProvider';

vi.mock('./CardArtwork', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('./Zone', () => ({
  default: ({
    id,
    label,
    cards,
    containerStyle,
    onCardTapAction,
    onZoneTapAction,
  }: {
    id: string;
    label: string;
    cards: Array<{ id: string }>;
    containerStyle?: React.CSSProperties;
    onCardTapAction?: (card: { id: string }, anchor: { x: number; y: number }) => boolean | void;
    onZoneTapAction?: (anchor: { x: number; y: number }) => void;
  }) => (
    <section data-testid={`zone-${id}`} data-border={containerStyle?.border ?? ''} data-min-height={containerStyle?.minHeight ?? ''}>
      <h3>{label}</h3>
      <span>{cards.length} cards</span>
      {onCardTapAction ? (
        <button type="button" onClick={() => onCardTapAction({ id: `${id}-card` }, { x: 320, y: 240 })}>
          Tap zone card
        </button>
      ) : null}
      {onZoneTapAction ? (
        <button type="button" onClick={() => onZoneTapAction({ x: 180, y: 220 })}>
          Tap zone
        </button>
      ) : null}
    </section>
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

describe('GameBoard extracted UI components - zones and controls', () => {
  it('lets board and hand rows share the board spacing token', () => {
    render(
      <>
        <GameBoardBoardRow columns="100px 200px 100px" width={400} rowGap="0.42rem">
          <div />
          <div />
          <div />
        </GameBoardBoardRow>
        <GameBoardHandRow columns="100px 200px 100px" width={400} centerWidth={200} rowGap="0.42rem">
          <div>Hand</div>
        </GameBoardHandRow>
      </>
    );

    expect(screen.getByText('Hand').parentElement?.parentElement).toHaveStyle({ gap: '0.42rem' });
    expect(screen.getByText('Hand').parentElement?.parentElement?.previousElementSibling).toHaveStyle({ gap: '0.42rem' });
  });

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

  it('passes custom leader zone min height', () => {
    render(
      <GameBoardLeaderZoneSection
        playerRole="host"
        label="Player 1"
        zoneLabel="Player 1 Leader"
        side="left"
        zoneMinHeight="124px"
        leaderCards={[]}
        sideZoneWidth={120}
        cardDetailLookup={{}}
        viewerRole="host"
        attackSourceController={null}
        searchLabel="Search"
        onSearch={vi.fn()}
      />
    );

    expect(screen.getByTestId('zone-leader-host')).toHaveAttribute('data-min-height', '124px');
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
    expect(button).toHaveStyle({ fontSize: '0.7rem', minHeight: '22px', padding: '3px 5px' });

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

  it('uses tap-to-open zone search actions when enabled and cards exist', () => {
    const onSearch = vi.fn();

    render(
      <GameBoardSearchableStackSection
        zoneProps={{
          id: 'banish-host',
          label: 'Banish',
          cards: [{ id: 'card-1' } as never],
        }}
        searchLabel="Search"
        onSearch={onSearch}
        useTapToOpenActions={true}
      />
    );

    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tap zone card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('overlays stack search actions without adding vertical height', () => {
    const onSearch = vi.fn();

    render(
      <GameBoardSearchableStackSection
        zoneProps={{
          id: 'banish-host',
          label: 'Banish',
          cards: [{ id: 'card-1' } as never],
        }}
        searchLabel="Search"
        onSearch={onSearch}
        actionPlacement="overlay"
      />
    );

    const button = screen.getByRole('button', { name: 'Search' });
    expect(screen.getByTestId('zone-banish-host').parentElement).toHaveStyle({
      gap: '0',
      position: 'relative',
    });
    expect(button.parentElement).toHaveStyle({
      position: 'absolute',
      right: '6px',
      bottom: '6px',
    });

    fireEvent.click(button);

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('hides inline zone search button for empty zones and opens via zone tap when tap-to-open is enabled', () => {
    const onSearch = vi.fn();

    render(
      <GameBoardSearchableStackSection
        zoneProps={{
          id: 'banish-host',
          label: 'Banish',
          cards: [],
        }}
        searchLabel="Search"
        onSearch={onSearch}
        useTapToOpenActions={true}
      />
    );

    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tap zone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
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

    expect(screen.getByRole('button', { name: 'Actions' })).toHaveStyle({
      fontSize: '0.7rem',
      minHeight: '22px',
      padding: '3px 5px',
    });
    expect(screen.getByRole('button', { name: 'Search' })).toHaveStyle({
      fontSize: '0.75rem',
      padding: '5px 6px',
    });

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

  it('uses tap-to-open main deck actions when enabled and cards exist', () => {
    const onSearch = vi.fn();
    const onActiveMenuChange = vi.fn();

    render(
      <GameBoardMainDeckSection
        zoneProps={{
          id: 'mainDeck-host',
          label: 'Main Deck',
          cards: [{ id: 'card-1' } as never],
        }}
        menuId="mainDeck-host"
        activeMenuId={null}
        actionsLabel="Actions"
        actions={[{ label: 'Search', onClick: onSearch }]}
        onActiveMenuChange={onActiveMenuChange}
        useTapToOpenActions={true}
      />
    );

    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tap zone card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onActiveMenuChange).toHaveBeenCalledWith(null);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('overlays main deck actions without adding vertical height', () => {
    const onSearch = vi.fn();
    const onActiveMenuChange = vi.fn();

    render(
      <GameBoardMainDeckSection
        zoneProps={{
          id: 'mainDeck-host',
          label: 'Main Deck',
          cards: [{ id: 'card-1' } as never],
        }}
        menuId="mainDeck-host"
        activeMenuId={null}
        actionsLabel="Actions"
        actions={[{ label: 'Search', onClick: onSearch }]}
        onActiveMenuChange={onActiveMenuChange}
        actionPlacement="overlay"
      />
    );

    const button = screen.getByRole('button', { name: 'Actions' });
    expect(screen.getByTestId('zone-mainDeck-host').parentElement).toHaveStyle({
      gap: '0',
      position: 'relative',
    });
    expect(button.parentElement?.parentElement).toHaveStyle({
      position: 'absolute',
      right: '6px',
      bottom: '6px',
    });

    fireEvent.click(button);

    expect(onActiveMenuChange).toHaveBeenCalledWith('mainDeck-host');
  });

  it('raises overlaid main deck actions while the menu is open', () => {
    render(
      <GameBoardMainDeckSection
        zoneProps={{
          id: 'mainDeck-host',
          label: 'Main Deck',
          cards: [{ id: 'card-1' } as never],
        }}
        menuId="mainDeck-host"
        activeMenuId="mainDeck-host"
        actionsLabel="Actions"
        actions={[
          { label: 'Search', onClick: vi.fn() },
          { label: 'Look Top (N)', onClick: vi.fn(), tone: 'accent' },
        ]}
        onActiveMenuChange={vi.fn()}
        actionPlacement="overlay"
      />
    );

    const button = screen.getByRole('button', { name: 'Actions' });

    expect(button.parentElement?.parentElement).toHaveStyle({ zIndex: '70' });
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Look Top (N)' }).parentElement).toHaveStyle({
      minWidth: '154px',
      right: 0,
    });
    expect(screen.getByRole('button', { name: 'Look Top (N)' })).toHaveStyle({
      whiteSpace: 'nowrap',
    });
  });

  it('uses a compact two-column touch sheet layout for multiple main deck actions', () => {
    render(
      <GameBoardMainDeckSection
        zoneProps={{
          id: 'mainDeck-host',
          label: 'Main Deck',
          cards: [{ id: 'card-1' } as never],
        }}
        menuId="mainDeck-host"
        activeMenuId={null}
        actionsLabel="Actions"
        actions={[
          { label: 'Search', onClick: vi.fn() },
          { label: 'Shuffle', onClick: vi.fn() },
          { label: 'Look Top', onClick: vi.fn(), tone: 'accent' },
        ]}
        onActiveMenuChange={vi.fn()}
        useTapToOpenActions={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tap zone card' }));

    const touchSheet = screen.getByTestId('gameboard-touch-action-sheet').firstElementChild as HTMLElement;
    expect(touchSheet).toHaveStyle({ gridTemplateColumns: '1fr 1fr', gap: '0.28rem' });
    expect(screen.getByRole('button', { name: 'Search' })).toHaveStyle({ minHeight: '30px' });
    const touchSheetWidth = parseInt(touchSheet.style.width, 10);
    expect(touchSheetWidth).toBeGreaterThanOrEqual(220);
    expect(touchSheetWidth).toBeLessThan(380);
  });

  it('positions touch sheet near tapped zone coordinates', async () => {
    render(
      <GameBoardMainDeckSection
        zoneProps={{
          id: 'mainDeck-host',
          label: 'Main Deck',
          cards: [{ id: 'card-1' } as never],
        }}
        menuId="mainDeck-host"
        activeMenuId={null}
        actionsLabel="Actions"
        actions={[{ label: 'Search', onClick: vi.fn() }]}
        onActiveMenuChange={vi.fn()}
        useTapToOpenActions={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tap zone card' }));

    await waitFor(() => {
      const sheet = screen.getByTestId('gameboard-touch-action-sheet') as HTMLElement;
      expect(sheet).toHaveStyle({ top: '248px' });
      const left = parseInt(sheet.style.left, 10);
      expect(left).toBeGreaterThanOrEqual(220);
      expect(left).toBeLessThanOrEqual(280);
    });
  });

  it('hides inline main deck actions for empty main deck and opens via zone tap when tap-to-open is enabled', () => {
    const onSearch = vi.fn();
    const onActiveMenuChange = vi.fn();

    render(
      <GameBoardMainDeckSection
        zoneProps={{
          id: 'mainDeck-host',
          label: 'Main Deck',
          cards: [],
        }}
        menuId="mainDeck-host"
        activeMenuId={null}
        actionsLabel="Actions"
        actions={[{ label: 'Search', onClick: onSearch }]}
        onActiveMenuChange={onActiveMenuChange}
        useTapToOpenActions={true}
      />
    );

    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tap zone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onActiveMenuChange).toHaveBeenCalledWith(null);
    expect(onSearch).toHaveBeenCalledTimes(1);
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

  it('uses compact spacing in turn panel for coarse input', () => {
    renderWithInputProfile(
      'coarse',
      <GameBoardTurnPanel
        isSoloMode={false}
        isCurrentPlayerTurn={true}
        currentTurnLabel="Self"
        turnCount={3}
        phase="Main"
        isBottomTurnActive={true}
        canChangePhase={true}
        onPhaseChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('gameboard-turn-panel')).toHaveStyle({ gap: '0.5rem' });
    expect(screen.getByRole('combobox', { name: 'Phase' })).toHaveStyle({ fontSize: '0.66rem' });
  });
});
