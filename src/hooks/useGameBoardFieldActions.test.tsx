import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCardCatalog } from '../utils/cardCatalog';
import {
  mockLoadCardCatalog,
  mockPeerJs,
  renderHarness,
  renderResumedHostHarness,
  installMockCatalogFetch,
  createCatalogCard,
} from './__tests__/gameBoardTestUtils';

describe('useGameBoardFieldActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPeerJs.reset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('moves a field card to the cemetery and keeps the move undoable', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'field-card',
        cardId: 'BP01-001',
        name: 'Aurelia',
        image: '/aurelia.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-cemetery-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Send Field Card to Cemetery' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-cemetery-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-cemetery-count')).toHaveTextContent('0');
  });

  it('updates atk and generic counters without creating an undoable move', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'counter-card',
        cardId: 'BP01-007',
        name: 'Counter Test',
        image: '/counter-test.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 1, hp: 0 },
        genericCounter: 2,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('counter-card-atk')).toHaveTextContent('1');
    expect(screen.getByTestId('counter-card-generic')).toHaveTextContent('2');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Add ATK Counter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Generic Counter' }));

    expect(screen.getByTestId('counter-card-atk')).toHaveTextContent('3');
    expect(screen.getByTestId('counter-card-generic')).toHaveTextContent('3');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('moves a card to the ex area through drag end and keeps the move undoable', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'drag-card',
        cardId: 'BP01-008',
        name: 'Drag Test',
        image: '/drag-test.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Drag Card to EX' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
  });

  it('treats a single token batch as a single undoable spawn token action', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Single Token Batch to EX' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo Move' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
  });

  it('toggles tap for the full attached stack', () => {
    renderResumedHostHarness({
      cards: [
        {
          id: 'tap-card',
          cardId: 'BP01-009',
          name: 'Tap Parent',
          image: '/tap-parent.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'tap-child',
          cardId: 'BP01-010',
          name: 'Tap Child',
          image: '/tap-child.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          attachedTo: 'tap-card',
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('tap-card-state')).toHaveTextContent('false');
    expect(screen.getByTestId('tap-child-state')).toHaveTextContent('false');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Tap Stack' }));

    expect(screen.getByTestId('tap-card-state')).toHaveTextContent('true');
    expect(screen.getByTestId('tap-child-state')).toHaveTextContent('true');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('does nothing when spawnTokens is called with only zero counts', () => {
    renderHarness('/game?mode=solo');

    fireEvent.click(screen.getByRole('button', { name: 'Spawn Zero Tokens' }));

    expect(screen.getByTestId('host-ex-count')).toHaveTextContent('0');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('false');
  });

  it('returns an evolve card from the field to the evolve deck', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'evolve-card',
        cardId: 'BP02-001',
        name: 'Dragon Warrior',
        image: '/dragon-warrior.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: true,
        isFlipped: false,
        counters: { atk: 2, hp: 1 },
        genericCounter: 3,
        isEvolveCard: true,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Return Evolve Card' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('toggles the evolve deck usage flag for the selected evolve card', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'flip-card',
        cardId: 'BP02-010',
        name: 'Dragon Warrior',
        image: '/dragon-warrior.png',
        zone: 'evolveDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: true,
        counters: { atk: 0, hp: 0 },
        isEvolveCard: true,
      }],
      gameStatus: 'preparing',
      revision: 7,
    });

    expect(screen.getByTestId('flip-card-state')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Evolve Usage' }));

    expect(screen.getByTestId('flip-card-state')).toHaveTextContent('false');
  });

  it('sends a field card to the bottom of the main deck', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'bottom-card',
        cardId: 'BP01-005',
        name: 'Aurelia',
        image: '/aurelia.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: true,
        isFlipped: false,
        counters: { atk: 3, hp: 2 },
        genericCounter: 1,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Send Field Card to Bottom' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-main-deck-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });

  it('keeps the existing evolve-deck placement behavior when no auto-attach target is on the field', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [{
        id: 'evolve-search-card',
        cardId: 'EVO-001',
        name: 'Base Follower',
        image: '/base-follower-evo.png',
        zone: 'evolveDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        isEvolveCard: true,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));
      await Promise.resolve();
    });

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('none');
  });

  it('auto-attaches an evolve card from search when a single related field card is present', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('2');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('attach-base-1');
  });

  it('ignores field cards that are already evolved when auto-attaching from search', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-1-evolved',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
          attachedTo: 'attach-base-1',
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('4');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('attach-base-2');
  });

  it('offers selection when exact and reprint targets both match and attaches the chosen card', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({ id: 'BASE-SP', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
      createCatalogCard({
        id: 'EVO-SP',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-SP', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-SP',
          name: 'Base Follower',
          image: '/base-follower-sp.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('2');
    expect(screen.getByTestId('auto-attach-selection-source')).toHaveTextContent('evolve-search-card');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Auto Attach Base 2' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('3');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('attach-base-2');
  });

  it('re-resolves auto-attach candidates while the selection is open and cancels invalid confirmations', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({ id: 'BASE-SP', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
      createCatalogCard({
        id: 'EVO-SP',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-SP', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'evolve-search-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-SP',
          name: 'Base Follower',
          image: '/base-follower-sp.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 8,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Extract Evolve to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('2');
    expect(screen.getByTestId('auto-attach-selection-targets')).toHaveTextContent('attach-base-1,attach-base-2');

    fireEvent.click(screen.getByRole('button', { name: 'Attach Base 1 Under Base 2' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('1');
    expect(screen.getByTestId('auto-attach-selection-targets')).toHaveTextContent('attach-base-2');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Auto Attach Base 1' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('1');
    expect(screen.getByTestId('evolve-search-attached-to')).toHaveTextContent('none');
  });

  it('auto-attaches an evolve card when dragged from the evolve deck onto an empty field zone', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Follower' }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-evolve-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Drag Evolve to Field' }));
      await Promise.resolve();
    });

    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('2');
    expect(screen.getByTestId('drag-evolve-attached-to')).toHaveTextContent('attach-base-1');
    expect(screen.getByTestId('drag-evolve-tapped')).toHaveTextContent('true');
  });

  it('keeps the existing placement behavior for special link cards when no target is on the field', async () => {
    installMockCatalogFetch([
      createCatalogCard({ id: 'BASE-001', name: 'Base Vanguard Unit' }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    renderResumedHostHarness({
      cards: [{
        id: 'link-search-card',
        cardId: 'DRIVE-001',
        name: 'ドライブポイント',
        image: '/drive-point.png',
        zone: 'evolveDeck-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
        isEvolveCard: true,
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Extract Linked to Field' }));

    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('link-search-linked-to')).toHaveTextContent('none');
    expect(screen.getByTestId('link-search-zone')).toHaveTextContent('field-host');
  });

  it('keeps token equipment play-to-field behavior without auto-linking it', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'EQUIP-001',
        name: 'アメスアミュレット',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'equipment-play-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Play Equipment to Field' }));

    expect(screen.getByTestId('equipment-play-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('equipment-play-linked-to')).toHaveTextContent('none');
  });

  it('auto-links a special card from search when a single related field card is present', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'link-search-card',
          cardId: 'DRIVE-001',
          name: 'ドライブポイント',
          image: '/drive-point.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'link-base-1',
          cardId: 'BASE-001',
          name: 'Base Vanguard Unit',
          image: '/base-vanguard-unit.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Extract Linked to Field' }));

    expect(screen.getByTestId('host-evolve-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-field-count')).toHaveTextContent('2');
    expect(screen.getByTestId('link-search-linked-to')).toHaveTextContent('link-base-1');
    expect(screen.getByTestId('link-search-zone')).toHaveTextContent('field-host');
  });

  it('offers selection for special link cards and links the chosen target', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Vanguard Unit',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'BASE-002',
        name: 'Base Vanguard Unit 2',
        related_cards: [{ id: 'DRIVE-001', name: 'ドライブポイント' }],
      }),
      createCatalogCard({
        id: 'DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-linked-card',
          cardId: 'DRIVE-001',
          name: 'ドライブポイント',
          image: '/drive-point.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'attach-base-1',
          cardId: 'BASE-001',
          name: 'Base Vanguard Unit',
          image: '/base-vanguard-unit.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'attach-base-2',
          cardId: 'BASE-002',
          name: 'Base Vanguard Unit 2',
          image: '/base-vanguard-unit-2.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Drag Linked Card to Field' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('2');
    expect(screen.getByTestId('auto-attach-selection-source')).toHaveTextContent('drag-linked-card');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Auto Attach Base 2' }));

    expect(screen.getByTestId('auto-attach-selection-count')).toHaveTextContent('0');
    expect(screen.getByTestId('drag-linked-linked-to')).toHaveTextContent('attach-base-2');
    expect(screen.getByTestId('drag-linked-zone')).toHaveTextContent('field-host');
  });

  it('links token equipment to a follower when manually dragged from ex', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'EQUIP-001',
        name: 'アメスアミュレット',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-equipment-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Drag Equipment to Base' }));

    expect(screen.getByTestId('drag-equipment-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-equipment-linked-to')).toHaveTextContent('equipment-base-card');
  });

  it('links token equipment even before the card catalog fetch resolves', () => {
    mockLoadCardCatalog.mockReturnValue(new Promise(() => { }) as ReturnType<typeof loadCardCatalog>);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-equipment-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
          cardKindNormalized: 'token_equipment',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          baseCardType: 'follower',
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Drag Equipment to Base' }));

    expect(screen.getByTestId('drag-equipment-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-equipment-linked-to')).toHaveTextContent('equipment-base-card');
  });

  it('links token equipment to the root follower when dropped onto an evolved unit', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'EQUIP-001',
        name: 'アメスアミュレット',
        deck_section: 'token',
        card_kind_normalized: 'token_equipment',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
      createCatalogCard({
        id: 'EVO-001',
        name: 'Base Follower',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_follower',
        related_cards: [{ id: 'BASE-001', name: 'Base Follower' }],
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-equipment-card',
          cardId: 'EQUIP-001',
          name: 'アメスアミュレット',
          image: '/equip.png',
          zone: 'ex-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isTokenCard: true,
          baseCardType: 'amulet',
        },
        {
          id: 'equipment-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
        {
          id: 'equipment-base-evolved-card',
          cardId: 'EVO-001',
          name: 'Base Follower',
          image: '/base-follower-evo.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          attachedTo: 'equipment-base-card',
          isEvolveCard: true,
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Drag Equipment to Evolved Base' }));

    expect(screen.getByTestId('drag-equipment-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-equipment-linked-to')).toHaveTextContent('equipment-base-card');
  });

  it('links a special card by manual drag and clears the link when moved back to the field', async () => {
    installMockCatalogFetch([
      createCatalogCard({
        id: 'VG-DRIVE-001',
        name: 'ドライブポイント',
        title: 'カードファイト!! ヴァンガード',
        deck_section: 'evolve',
        card_kind_normalized: 'evolve_spell',
      }),
      createCatalogCard({
        id: 'BASE-001',
        name: 'Base Follower',
      }),
    ]);

    renderResumedHostHarness({
      cards: [
        {
          id: 'drag-linked-card',
          cardId: 'VG-DRIVE-001',
          name: 'ドライブポイント',
          image: '/drive-point.png',
          zone: 'evolveDeck-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          isEvolveCard: true,
        },
        {
          id: 'link-base-card',
          cardId: 'BASE-001',
          name: 'Base Follower',
          image: '/base-follower.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: true,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
        },
      ],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    await act(async () => { });

    fireEvent.click(screen.getByRole('button', { name: 'Drag Linked Card to Base' }));

    expect(screen.getByTestId('drag-linked-linked-to')).toHaveTextContent('link-base-card');
    expect(screen.getByTestId('drag-linked-zone')).toHaveTextContent('field-host');
    expect(screen.getByTestId('drag-linked-tapped')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Drag Linked Card to Field' }));

    expect(screen.getByTestId('drag-linked-linked-to')).toHaveTextContent('none');
    expect(screen.getByTestId('drag-linked-zone')).toHaveTextContent('field-host');
  });

  it('moves a field card to banish', () => {
    renderResumedHostHarness({
      cards: [{
        id: 'banish-card',
        cardId: 'BP01-006',
        name: 'Bellringer Angel',
        image: '/bellringer-angel.png',
        zone: 'field-host',
        owner: 'host',
        isTapped: false,
        isFlipped: false,
        counters: { atk: 0, hp: 0 },
      }],
      gameStatus: 'playing',
      turnCount: 2,
      phase: 'Main',
      revision: 7,
    });

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('1');
    expect(screen.getByTestId('host-banish-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'Banish Field Card' }));

    expect(screen.getByTestId('host-field-count')).toHaveTextContent('0');
    expect(screen.getByTestId('host-banish-count')).toHaveTextContent('1');
    expect(screen.getByTestId('can-undo-move')).toHaveTextContent('true');
  });
});
