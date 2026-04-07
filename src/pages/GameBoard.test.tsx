import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GameBoard from './GameBoard';
import { useGameBoardLogic } from '../hooks/useGameBoardLogic';
import { saveDeck } from '../utils/deckStorage';
import { initialState, type SyncState, type TokenOption } from '../types/game';
import type { CardInspectAnchor, CardInstance } from '../components/Card';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckState } from '../models/deckState';
import type { DeckRuleConfig } from '../models/deckRule';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/Zone', () => ({
  default: ({
    id,
    label,
    cards,
    onInspectCard,
    onAttack,
  }: {
    id: string;
    label: string;
    cards: CardInstance[];
    onInspectCard?: (card: CardInstance, anchor: CardInspectAnchor) => void;
    onAttack?: (id: string) => void;
  }) => (
    <section data-testid={`zone-${id}`}>
      <h3>{label}</h3>
      {cards.map((card) => (
        <div key={card.id} className="game-card" data-card-id={card.id}>
          <span>{card.name}</span>
          {onInspectCard && (
            <button
              type="button"
              onClick={() => onInspectCard(card, {
                top: 40,
                left: 40,
                right: 140,
                bottom: 180,
                width: 100,
                height: 140,
              })}
            >
              Inspect {card.name}
            </button>
          )}
          {onAttack && (
            <button type="button" onClick={() => onAttack(card.id)}>
              Attack {card.name}
            </button>
          )}
        </div>
      ))}
    </section>
  ),
}));

vi.mock('../components/CardSearchModal', () => ({
  default: ({
    isOpen,
    title,
    onClose,
  }: {
    isOpen: boolean;
    title: string;
    onClose: () => void;
  }) => (
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onClose}>Close Search</button>
      </div>
    ) : null
  ),
}));

vi.mock('../components/TopDeckModal', () => ({
  default: ({
    isOpen,
    onCancel,
  }: {
    isOpen: boolean;
    onCancel: () => void;
  }) => (
    isOpen ? (
      <div role="dialog" aria-label="Top Deck Modal">
        <button type="button" onClick={onCancel}>Close Top Deck</button>
      </div>
    ) : null
  ),
}));

vi.mock('../components/CardArtwork', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('../hooks/useGameBoardLogic', () => ({
  useGameBoardLogic: vi.fn(),
}));

vi.mock('../utils/deckBuilderRules', async () => {
  const actual = await vi.importActual<typeof import('../utils/deckBuilderRules')>('../utils/deckBuilderRules');

  return {
    ...actual,
    getDeckValidationMessages: vi.fn((): [] => []),
    sanitizeImportedDeckState: vi.fn((deckState: DeckState) => deckState),
  };
});

const mockUseGameBoardLogic = vi.mocked(useGameBoardLogic);

const ruleConfig: DeckRuleConfig = {
  format: 'other',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [null, null],
};

const catalogCards: DeckBuilderCardData[] = [
  {
    id: 'TEST-001',
    name: 'Alpha Knight',
    image: '/alpha.png',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー',
    subtype: '兵士',
    rarity: 'LG',
    product_name: 'Booster Pack',
    cost: '2',
    atk: '2',
    hp: '2',
    ability_text: '[Fanfare] Test ability.',
    card_kind_normalized: 'follower',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'TEST-LEADER',
    name: 'Leader Alice',
    image: '/leader.png',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'リーダー',
    rarity: 'PR',
    product_name: 'Leader Set',
    cost: '-',
    card_kind_normalized: 'leader',
    deck_section: 'leader',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
];

const makeCard = (overrides: Partial<CardInstance> = {}): CardInstance => ({
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
  ...overrides,
});

const createGameState = (cards: CardInstance[], overrides: Partial<SyncState> = {}): SyncState => ({
  ...initialState,
  gameStatus: 'preparing',
  cards,
  ...overrides,
});

const buildMockGameBoardLogic = (
  overrides: Partial<ReturnType<typeof useGameBoardLogic>> = {}
): ReturnType<typeof useGameBoardLogic> => {
  const gameState = overrides.gameState ?? createGameState([]);

  return {
    room: 'ROOM123',
    mode: 'p2p',
    isSoloMode: false,
    isHost: true,
    role: 'host',
    status: 'Connected! Waiting for guest...',
    connectionState: 'connected',
    canInteract: true,
    attemptReconnect: vi.fn(),
    gameState,
    savedSessionCandidate: null,
    resumeSavedSession: vi.fn(),
    discardSavedSession: vi.fn(),
    searchZone: null,
    setSearchZone: vi.fn(),
    showResetConfirm: false,
    setShowResetConfirm: vi.fn(),
    coinMessage: null,
    turnMessage: null,
    cardPlayMessage: null,
    attackMessage: null,
    attackHistory: [],
    eventHistory: [],
    attackVisual: null,
    revealedCardsOverlay: null,
    cardStatLookup: {},
    cardDetailLookup: {},
    isRollingDice: false,
    diceValue: null,
    mulliganOrder: [],
    isMulliganModalOpen: false,
    setIsMulliganModalOpen: vi.fn(),
    handleStatChange: vi.fn(),
    setPhase: vi.fn(),
    endTurn: vi.fn(),
    handleUndoTurn: vi.fn(),
    handleSetInitialTurnOrder: vi.fn(),
    handlePureCoinFlip: vi.fn(),
    handleRollDice: vi.fn(),
    handleStartGame: vi.fn(),
    handleToggleReady: vi.fn(),
    handleDrawInitialHand: vi.fn(),
    startMulligan: vi.fn(),
    handleMulliganOrderSelect: vi.fn(),
    executeMulligan: vi.fn(),
    drawCard: vi.fn(),
    handleExtractCard: vi.fn(),
    confirmResetGame: vi.fn(),
    handleDeckUpload: vi.fn(),
    importDeckData: vi.fn(),
    spawnToken: vi.fn(),
    spawnTokens: vi.fn(),
    handleModifyCounter: vi.fn(),
    handleModifyGenericCounter: vi.fn(),
    handleDragEnd: vi.fn(),
    toggleTap: vi.fn(),
    handleFlipCard: vi.fn(),
    handleSendToBottom: vi.fn(),
    handleBanish: vi.fn(),
    handlePlayToField: vi.fn(),
    handleSendToCemetery: vi.fn(),
    handleReturnEvolve: vi.fn(),
    handleShuffleDeck: vi.fn(),
    handleDeclareAttack: vi.fn(),
    handleSetRevealHandsMode: vi.fn(),
    evolveAutoAttachSelection: null,
    confirmEvolveAutoAttachSelection: vi.fn(),
    cancelEvolveAutoAttachSelection: vi.fn(),
    getCards: (zone: string) => gameState.cards.filter(card => card.zone === zone),
    getTokenOptions: vi.fn(() => []),
    lastGameState: null,
    millCard: vi.fn(),
    moveTopCardToEx: vi.fn(),
    discardRandomHandCards: vi.fn(),
    topDeckCards: [],
    topDeckTargetRole: 'host',
    setTopDeckTargetRole: vi.fn(),
    handleLookAtTop: vi.fn(),
    handleResolveTopDeck: vi.fn(),
    setTopDeckCards: vi.fn(),
    handleUndoCardMove: vi.fn(),
    hasUndoableMove: false,
    canUndoTurn: null,
    isDebug: false,
    ...overrides,
  } as ReturnType<typeof useGameBoardLogic>;
};

describe('GameBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(catalogCards),
      } as unknown as Response)
    );

    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic());
  });

  it('copies the room id and shows copied feedback', async () => {
    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith('ROOM123');
    });

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('shows the previous host session prompt and wires resume/discard actions', () => {
    const resumeSavedSession = vi.fn();
    const discardSavedSession = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      savedSessionCandidate: {
        room: 'ROOM123',
        savedAt: '2026-04-04T00:00:00.000Z',
        appVersion: '1.0.0',
        state: initialState,
      },
      resumeSavedSession,
      discardSavedSession,
    }));

    render(<GameBoard />);

    expect(screen.getByText('Previous host session found for this room.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume Previous Session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(resumeSavedSession).toHaveBeenCalledTimes(1);
    expect(discardSavedSession).toHaveBeenCalledTimes(1);
  });

  it('shows the preparation checklist and toggles reveal hands mode', () => {
    const handleSetRevealHandsMode = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      handleSetRevealHandsMode,
    }));

    render(<GameBoard />);

    expect(screen.getByText('Preparing Game')).toBeInTheDocument();
    expect(screen.getByText('Reveal Hands Mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OFF' }));

    expect(handleSetRevealHandsMode).toHaveBeenCalledWith(true);
  });

  it('shows the solo preparation ready status summary', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      gameState: createGameState([], {
        host: {
          ...initialState.host,
          initialHandDrawn: true,
          isReady: false,
        },
        guest: {
          ...initialState.guest,
          initialHandDrawn: false,
          isReady: true,
        },
      }),
    }));

    render(<GameBoard />);

    expect(screen.getByTestId('preparation-ready-status-host')).toHaveTextContent('PLAYER 1');
    expect(screen.getByTestId('preparation-ready-status-host')).toHaveTextContent('DECIDING');
    expect(screen.getByTestId('preparation-ready-status-guest')).toHaveTextContent('PLAYER 2');
    expect(screen.getByTestId('preparation-ready-status-guest')).toHaveTextContent('READY');
  });

  it('wires solo preparation controls for turn order and start game', () => {
    const handleSetInitialTurnOrder = vi.fn();
    const handleStartGame = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      handleSetInitialTurnOrder,
      handleStartGame,
      gameState: createGameState([], {
        host: {
          ...initialState.host,
          initialHandDrawn: true,
          isReady: true,
        },
        guest: {
          ...initialState.guest,
          initialHandDrawn: true,
          isReady: true,
        },
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Player 1 1st' }));
    fireEvent.click(screen.getByRole('button', { name: '▶ START GAME' }));

    expect(handleSetInitialTurnOrder).toHaveBeenCalledWith('host');
    expect(handleStartGame).toHaveBeenCalledTimes(1);
  });

  it('wires playing header controls for coin toss and dice roll', () => {
    const handlePureCoinFlip = vi.fn();
    const handleRollDice = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      handlePureCoinFlip,
      handleRollDice,
      gameState: createGameState([], {
        gameStatus: 'playing',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: '🪙 Toss Coin' }));
    fireEvent.click(screen.getByRole('button', { name: '🎲 Roll Dice' }));

    expect(handlePureCoinFlip).toHaveBeenCalledTimes(1);
    expect(handleRollDice).toHaveBeenCalledTimes(1);
  });

  it('shows recent events while playing', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([], {
        gameStatus: 'playing',
      }),
      eventHistory: [
        'Host drew a card.',
        'Guest evolved Alpha Knight.',
      ],
    }));

    render(<GameBoard />);

    expect(screen.getByText('Recent Events')).toBeInTheDocument();
    expect(screen.getByText('Host drew a card.')).toBeInTheDocument();
    expect(screen.getByText('Guest evolved Alpha Knight.')).toBeInTheDocument();
  });

  it('shows the dice overlay while rolling', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      isRollingDice: true,
      diceValue: 6,
    }));

    render(<GameBoard />);

    expect(screen.getByRole('status')).toHaveTextContent('6');
  });

  it('shows the coin toss result overlay', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      coinMessage: 'Host goes first!',
    }));

    render(<GameBoard />);

    expect(screen.getByRole('status')).toHaveTextContent('Host goes first!');
  });

  it('shows the revealed cards overlay when cards are revealed', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      revealedCardsOverlay: {
        type: 'look-top',
        title: 'Look at Top 3 Cards',
        cards: [
          { cardId: 'TEST-001', name: 'Alpha Knight', image: '/alpha.png' },
        ],
        summaryLines: ['1 to hand', '2 to bottom'],
      },
      cardDetailLookup: {
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
          abilityText: '[Fanfare] Test ability.',
        },
      },
    }));

    render(<GameBoard />);

    expect(screen.getByRole('status')).toHaveTextContent('Look at Top 3 Cards');
    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('1 to hand')).toBeInTheDocument();
    expect(screen.getByText('2 to bottom')).toBeInTheDocument();
  });

  it('shows transient turn, card play, and attack messages', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      turnMessage: 'YOUR TURN',
      cardPlayMessage: 'Alpha Knight was played.',
      attackMessage: 'Alpha Knight attacks!',
    }));

    render(<GameBoard />);

    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight was played.')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight attacks!')).toBeInTheDocument();
  });

  it('shows the attack line overlay when an attack target is highlighted', () => {
    const attacker = makeCard({
      id: 'card-1',
      zone: 'field-host',
      owner: 'host',
    });
    const defender = makeCard({
      id: 'card-2',
      name: 'Beta Guard',
      zone: 'field-guest',
      owner: 'guest',
    });

    const gameState = createGameState([attacker, defender], {
      gameStatus: 'playing',
    });
    const attackVisual = {
      attackerCardId: 'card-1',
      target: {
        type: 'card',
        cardId: 'card-2',
      },
    } as ReturnType<typeof useGameBoardLogic>['attackVisual'];

    mockUseGameBoardLogic
      .mockReturnValueOnce(buildMockGameBoardLogic({
        gameState,
        attackVisual: null,
      }))
      .mockReturnValue(buildMockGameBoardLogic({
        gameState,
        attackVisual,
      }));

    const { container, rerender } = render(<GameBoard />);
    rerender(<GameBoard />);

    expect(container.querySelector('svg line')).not.toBeNull();
  });

  it('opens the token spawn dialog, updates the count, and generates tokens', async () => {
    const spawnTokens = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([], {
        gameStatus: 'playing',
      }),
      spawnTokens,
      getTokenOptions: vi.fn((): TokenOption[] => ([
        {
          cardId: 'TOKEN-001',
          name: 'Knight Token',
          image: '/token.png',
          baseCardType: 'follower',
        },
      ])),
      cardDetailLookup: {
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
      },
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Spawn My Token' }));

    const dialog = await screen.findByRole('dialog', { name: 'Generate Tokens' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase Knight Token count' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Generate' }));

    expect(spawnTokens).toHaveBeenCalledWith(
      'host',
      [{
        tokenOption: {
          cardId: 'TOKEN-001',
          name: 'Knight Token',
          image: '/token.png',
          baseCardType: 'follower',
        },
        count: 1,
      }],
      'ex'
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Generate Tokens' })).not.toBeInTheDocument();
    });
  });

  it('shows the evolve auto attach dialog and wires cancel and confirm actions', async () => {
    const confirmEvolveAutoAttachSelection = vi.fn();
    const cancelEvolveAutoAttachSelection = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      evolveAutoAttachSelection: {
        actor: 'host',
        sourceCard: makeCard({
          id: 'evolve-1',
          cardId: 'EVOLVE-001',
          name: 'Evolved Alpha',
          image: '/evolve.png',
          zone: 'evolveDeck-host',
          isEvolveCard: true,
          cardKindNormalized: 'evolve',
        }),
        candidateCards: [
          makeCard({
            id: 'candidate-1',
            cardId: 'TEST-001',
            name: 'Alpha Knight',
            zone: 'field-host',
          }),
        ],
        placement: 'stack',
      } as ReturnType<typeof useGameBoardLogic>['evolveAutoAttachSelection'],
      confirmEvolveAutoAttachSelection,
      cancelEvolveAutoAttachSelection,
      cardDetailLookup: {
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
      },
    }));

    render(<GameBoard />);

    expect(await screen.findByRole('dialog', { name: 'Choose Target Card' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: /Alpha Knight.*TEST-001/ }));

    expect(cancelEvolveAutoAttachSelection).toHaveBeenCalledTimes(1);
    expect(confirmEvolveAutoAttachSelection).toHaveBeenCalledWith('candidate-1');
  });

  it('shows the turn panel while playing and updates the phase', () => {
    const setPhase = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      setPhase,
      gameState: createGameState([], {
        gameStatus: 'playing',
        turnPlayer: 'host',
        turnCount: 3,
        phase: 'Main',
      }),
    }));

    render(<GameBoard />);

    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    expect(screen.getByText('TURN 3')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Phase' }), { target: { value: 'End' } });

    expect(setPhase).toHaveBeenCalledWith('End');
  });

  it('renders the solo end turn button and ends the active player turn', () => {
    const endTurn = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      isHost: true,
      role: 'host',
      endTurn,
      gameState: createGameState([], {
        gameStatus: 'playing',
        turnPlayer: 'host',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'End Player 1 Turn' }));

    expect(endTurn).toHaveBeenCalledWith('host');
  });

  it('updates solo player tracker stats from the tracker controls', () => {
    const handleStatChange = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      isHost: true,
      role: 'host',
      handleStatChange,
      gameState: createGameState([], {
        gameStatus: 'playing',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByTestId('player-tracker-host-hp-increase'));
    fireEvent.click(screen.getByTestId('player-tracker-host-pp-decrease'));

    expect(handleStatChange).toHaveBeenCalledWith('host', 'hp', 1);
    expect(handleStatChange).toHaveBeenCalledWith('host', 'pp', -1);
  });

  it('opens the zone actions menu and shuffles the selected deck', () => {
    const handleShuffleDeck = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      isHost: true,
      role: 'host',
      handleShuffleDeck,
      gameState: createGameState([], {
        gameStatus: 'playing',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Actions' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }));

    expect(handleShuffleDeck).toHaveBeenCalledWith('guest');
  });

  it('opens random opponent hand discard from the hand actions menu', () => {
    const discardRandomHandCards = vi.fn();
    const guestHandCard = makeCard({
      id: 'hand-guest-1',
      zone: 'hand-guest',
      owner: 'guest',
    });

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      discardRandomHandCards,
      gameState: createGameState([guestHandCard], {
        gameStatus: 'playing',
      }),
    }));

    render(<GameBoard />);

    const opponentHandPanel = screen.getByTestId('zone-hand-guest').parentElement;
    expect(opponentHandPanel).not.toBeNull();

    fireEvent.click(within(opponentHandPanel as HTMLElement).getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Random Discard' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(discardRandomHandCards).toHaveBeenCalledWith('guest', 2, 'host');
  });

  it('opens leader zone search from the solo board', async () => {
    const setSearchZone = vi.fn();
    const hostLeaderA = makeCard({
      id: 'leader-host-a',
      cardId: 'TEST-LEADER-A',
      name: 'Leader A',
      zone: 'leader-host',
      owner: 'host',
    });
    const hostLeaderB = makeCard({
      id: 'leader-host-b',
      cardId: 'TEST-LEADER-B',
      name: 'Leader B',
      zone: 'leader-host',
      owner: 'host',
    });

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      isHost: true,
      role: 'host',
      setSearchZone,
      gameState: createGameState([hostLeaderA, hostLeaderB], {
        gameStatus: 'playing',
      }),
    }));

    const { container } = render(<GameBoard />);
    const leaderZone = container.querySelector('[data-testid="leader-zone-leader-host"]');

    expect(leaderZone).not.toBeNull();
    fireEvent.click(within(leaderZone as HTMLElement).getByRole('button', { name: 'Player 1 leader search' }));

    expect(setSearchZone).toHaveBeenCalledWith({
      id: 'leader-host',
      title: 'Player 1 Leader',
    });
  });

  it('opens cemetery search from the opponent board', () => {
    const setSearchZone = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([]),
      setSearchZone,
    }));

    render(<GameBoard />);

    const cemeteryZone = screen.getByTestId('zone-cemetery-guest');
    const cemeteryPanel = cemeteryZone.parentElement;

    expect(cemeteryPanel).not.toBeNull();

    fireEvent.click(within(cemeteryPanel as HTMLElement).getByRole('button', { name: 'Search' }));

    expect(setSearchZone).toHaveBeenCalledWith({
      id: 'cemetery-guest',
      title: 'Opponent Cemetery',
    });
  });

  it('renders the search modal and closes it through the page handler', () => {
    const setSearchZone = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      setSearchZone,
      searchZone: {
        id: 'cemetery-guest',
        title: 'Opponent Cemetery',
      },
      gameState: createGameState([]),
    }));

    render(<GameBoard />);

    expect(screen.getByRole('dialog', { name: 'Opponent Cemetery' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Search' }));

    expect(setSearchZone).toHaveBeenCalledWith(null);
  });

  it('renders the top deck modal and closes it through the page handler', () => {
    const setTopDeckCards = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      topDeckCards: [
        makeCard({
          id: 'topdeck-1',
          zone: 'mainDeck-host',
          owner: 'host',
        }),
      ],
      setTopDeckCards,
      gameState: createGameState([
        makeCard({
          id: 'hand-host-1',
          zone: 'hand-host',
          owner: 'host',
        }),
      ], {
        gameStatus: 'playing',
      }),
    }));

    render(<GameBoard />);

    expect(screen.getByRole('dialog', { name: 'Top Deck Modal' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Top Deck' }));

    expect(setTopDeckCards).toHaveBeenCalledWith([]);
  });

  it('shows the reconnecting alert when guest actions are locked', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      isHost: false,
      role: 'guest',
      canInteract: false,
      connectionState: 'reconnecting',
      status: 'Reconnecting...',
    }));

    render(<GameBoard />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reconnecting to host. Actions are temporarily locked until the latest state is synced.'
    );
  });

  it('renders the mulligan modal when it is open', () => {
    const handCard = makeCard({
      id: 'hand-host-1',
      zone: 'hand-host',
      owner: 'host',
    });

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([handCard], {
        gameStatus: 'preparing',
        host: {
          ...initialState.host,
          initialHandDrawn: true,
        },
      }),
      isMulliganModalOpen: true,
      mulliganOrder: [],
    }));

    render(<GameBoard />);

    expect(screen.getByText('Mulligan: Select Return Order')).toBeInTheDocument();
    expect(screen.getByAltText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exchange (Mulligan)' })).toBeDisabled();
  });

  it('opens mulligan from the preparation button', () => {
    const startMulligan = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      startMulligan,
      gameState: createGameState([], {
        gameStatus: 'preparing',
        host: {
          ...initialState.host,
          initialHandDrawn: true,
          mulliganUsed: false,
        },
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Mulligan (Mulligan)' }));

    expect(startMulligan).toHaveBeenCalledTimes(1);
  });

  it('opens the undo turn dialog and confirms undo', async () => {
    const handleUndoTurn = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      handleUndoTurn,
      lastGameState: initialState,
      canUndoTurn: true,
      gameState: createGameState([], {
        gameStatus: 'playing',
        turnPlayer: 'guest',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: '↺ UNDO LAST END TURN' }));

    expect(await screen.findByRole('dialog', { name: 'Undo Last End Turn' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Undo' }));

    await waitFor(() => {
      expect(handleUndoTurn).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog', { name: 'Undo Last End Turn' })).not.toBeInTheDocument();
    });
  });

  it('shows move undo during Player 2 turn in solo mode', () => {
    const handleUndoCardMove = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'solo',
      isSoloMode: true,
      isHost: true,
      role: 'host',
      handleUndoCardMove,
      hasUndoableMove: true,
      gameState: createGameState([], {
        gameStatus: 'playing',
        turnPlayer: 'guest',
        lastUndoableCardMoveActor: 'guest',
      }),
    }));

    render(<GameBoard />);

    expect(screen.queryByTestId('undo-move-host')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('undo-move-guest'));

    expect(handleUndoCardMove).toHaveBeenCalledTimes(1);
  });

  it('keeps move undo hidden during the opponent turn in p2p', () => {
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      mode: 'p2p',
      isSoloMode: false,
      isHost: true,
      role: 'host',
      hasUndoableMove: true,
      gameState: createGameState([], {
        gameStatus: 'playing',
        turnPlayer: 'guest',
        lastUndoableCardMoveActor: 'host',
      }),
    }));

    render(<GameBoard />);

    expect(screen.queryByTestId('undo-move-host')).not.toBeInTheDocument();
  });

  it('shows the reset game dialog and wires cancel/confirm actions', () => {
    const setShowResetConfirm = vi.fn();
    const confirmResetGame = vi.fn();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      showResetConfirm: true,
      setShowResetConfirm,
      confirmResetGame,
    }));

    render(<GameBoard />);

    expect(screen.getByRole('dialog', { name: 'Reset Game' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    expect(setShowResetConfirm).toHaveBeenCalledWith(false);
    expect(confirmResetGame).toHaveBeenCalledTimes(1);
  });

  it('opens the saved deck picker, filters saved decks, and imports the selected deck', async () => {
    saveDeck({
      name: 'Alpha Deck',
      ruleConfig,
      deckState: {
        mainDeck: [catalogCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Beta Deck',
      ruleConfig,
      deckState: {
        mainDeck: [catalogCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    const importDeckData = vi.fn();
    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      importDeckData,
    }));

    render(<GameBoard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Load from My Decks' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Load from My Decks' }));

    const picker = await screen.findByRole('dialog', { name: 'Load from My Decks' });
    fireEvent.change(within(picker).getByRole('textbox', { name: 'Search saved decks' }), {
      target: { value: 'beta' },
    });

    await waitFor(() => {
      expect(within(picker).queryByText('Alpha Deck')).not.toBeInTheDocument();
    });

    expect(within(picker).getByText('Beta Deck')).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole('button', { name: 'Load' }));

    expect(importDeckData).toHaveBeenCalledWith({
      mainDeck: [catalogCards[0]],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    }, 'host');
  });

  it('closes the saved deck picker when the backdrop is clicked', async () => {
    saveDeck({
      name: 'Alpha Deck',
      ruleConfig,
      deckState: {
        mainDeck: [catalogCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic());

    render(<GameBoard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Load from My Decks' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Load from My Decks' }));

    const picker = await screen.findByRole('dialog', { name: 'Load from My Decks' });
    const backdrop = picker.parentElement;
    expect(backdrop).not.toBeNull();

    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Load from My Decks' })).not.toBeInTheDocument();
    });
  });

  it('opens the card inspector for an inspectable card and closes it from outside click', async () => {
    const fieldCard = makeCard();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([fieldCard], { gameStatus: 'playing' }),
      cardDetailLookup: {
        'TEST-001': {
          id: 'TEST-001',
          name: 'Alpha Knight',
          image: '/alpha.png',
          className: 'Royal',
          title: 'Hero Tale',
          type: 'Follower',
          subtype: 'Soldier',
          cardKindNormalized: 'follower',
          cost: '2',
          atk: 2,
          hp: 2,
          abilityText: '[Fanfare] Test ability.',
        },
      },
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Alpha Knight' }));

    const inspector = await screen.findByTestId('card-inspector');
    expect(within(inspector).getByText('Alpha Knight')).toBeInTheDocument();
    expect(within(inspector).getByText('TEST-001')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId('card-inspector')).not.toBeInTheDocument();
    });
  });

  it('closes the card inspector with the Escape key', async () => {
    const fieldCard = makeCard();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([fieldCard], { gameStatus: 'playing' }),
      cardDetailLookup: {
        'TEST-001': {
          id: 'TEST-001',
          name: 'Alpha Knight',
          image: '/alpha.png',
          className: 'Royal',
          title: 'Hero Tale',
          type: 'Follower',
          subtype: 'Soldier',
          cardKindNormalized: 'follower',
          cost: '2',
          atk: 2,
          hp: 2,
          abilityText: '[Fanfare] Test ability.',
        },
      },
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Alpha Knight' }));
    expect(await screen.findByTestId('card-inspector')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('card-inspector')).not.toBeInTheDocument();
    });
  });

  it('enters attack mode for a valid attacker and lets the user cancel it', async () => {
    const attacker = makeCard();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([attacker], {
        gameStatus: 'playing',
        turnPlayer: 'host',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Attack Alpha Knight' }));

    expect(await screen.findByText('ATTACK MODE')).toBeInTheDocument();
    expect(screen.getByText((_, node) => (
      node?.textContent === 'Select an enemy follower or leader for Alpha Knight.'
    ))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('ATTACK MODE')).not.toBeInTheDocument();
    });
  });

  it('closes attack mode with the Escape key', async () => {
    const attacker = makeCard();

    mockUseGameBoardLogic.mockReturnValue(buildMockGameBoardLogic({
      gameState: createGameState([attacker], {
        gameStatus: 'playing',
        turnPlayer: 'host',
      }),
    }));

    render(<GameBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Attack Alpha Knight' }));
    expect(await screen.findByText('ATTACK MODE')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('ATTACK MODE')).not.toBeInTheDocument();
    });
  });
});
