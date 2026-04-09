import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardCountDialog from './GameBoardCountDialog';
import GameBoardDialogsHost from './GameBoardDialogsHost';
import GameBoardEvolveAutoAttachDialog from './GameBoardEvolveAutoAttachDialog';
import GameBoardResetDialog from './GameBoardResetDialog';
import GameBoardSavedDeckPickerDialog from './GameBoardSavedDeckPickerDialog';
import GameBoardTokenSpawnDialog from './GameBoardTokenSpawnDialog';
import GameBoardTopNDialog from './GameBoardTopNDialog';
import GameBoardUndoTurnDialog from './GameBoardUndoTurnDialog';

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

describe('GameBoard extracted UI components - dialogs', () => {
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
        schemaVersion: 1 as const,
        id: 'deck-1',
        name: 'Alpha Deck',
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-05T00:00:00.000Z',
        ruleConfig: {
          format: 'other' as const,
          identityType: 'class' as const,
          selectedClass: null,
          selectedTitle: null,
          selectedClasses: [null, null] as [null, null],
        },
        sections: {
          main: [],
          evolve: [],
          leader: [],
          token: [],
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

  it('renders top-n dialog and immediately confirms preset values', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(5);
  });

  it('renders a generic count dialog with custom labels', () => {
    const onValueChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardCountDialog
        value={1}
        title="Discard random cards"
        customLabel="Custom"
        customInputLabel="Custom discard count"
        confirmLabel="Discard"
        onValueChange={onValueChange}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Discard random cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Custom discard count' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onValueChange).toHaveBeenCalledWith(4);
    expect(onConfirm).toHaveBeenCalledWith(4);
  });

  it('shows the top-n custom input only when Other is selected', () => {
    const onValueChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardTopNDialog
        value={3}
        onValueChange={onValueChange}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByRole('spinbutton', { name: 'Custom card count' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Custom card count' }), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    expect(onValueChange).toHaveBeenCalledWith(7);
    expect(onConfirm).toHaveBeenCalledWith(7);
  });

  it('normalizes leading zeros in the top-n custom input', () => {
    const onValueChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <GameBoardTopNDialog
        value={3}
        onValueChange={onValueChange}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    const customInput = screen.getByRole('spinbutton', { name: 'Custom card count' });

    fireEvent.change(customInput, { target: { value: '09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look' }));

    expect(customInput).toHaveValue(9);
    expect(onValueChange).toHaveBeenCalledWith(9);
    expect(onConfirm).toHaveBeenCalledWith(9);
  });

  it('renders token spawn dialog and wires destination, count, cancel, and confirm', () => {
    const onDestinationChange = vi.fn();
    const onCountChange = vi.fn();
    const onQuickSpawnToken = vi.fn();
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
        onQuickSpawnToken={onQuickSpawnToken}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Generate Tokens' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Knight Token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Field' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Knight Token count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Knight Token count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(onDestinationChange).toHaveBeenCalledWith('field');
    expect(onQuickSpawnToken).toHaveBeenCalledWith('TOKEN-001');
    expect(onCountChange).toHaveBeenCalledWith('TOKEN-001', 1);
    expect(onCountChange).toHaveBeenCalledWith('TOKEN-001', -1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps the token spawn dialog actions reachable when many token options exist', () => {
    render(
      <GameBoardTokenSpawnDialog
        tokenSpawnOptions={Array.from({ length: 12 }, (_, index) => ({
          cardId: `TOKEN-${index + 1}`,
          name: `Token ${index + 1}`,
          image: `/token-${index + 1}.png`,
          baseCardType: 'follower',
        }))}
        tokenSpawnCounts={{}}
        tokenSpawnDestination="ex"
        totalTokenSpawnCount={0}
        cardDetailLookup={{}}
        onDestinationChange={vi.fn()}
        onCountChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('token-spawn-dialog')).toHaveStyle({
      maxHeight: 'min(88vh, 960px)',
      overflow: 'hidden',
    });
    expect(screen.getByTestId('token-spawn-options')).toHaveStyle({
      overflowY: 'auto',
    });
    expect(screen.getByRole('button', { name: 'Generate' })).toBeVisible();
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
