import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Zone from './Zone';
import type { CardInstance } from './Card';
import GameBoardInputProfileProvider from '../contexts/GameBoardInputProfileProvider';

const droppableState = { isOver: false };

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    isOver: droppableState.isOver,
    setNodeRef: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'zone.mainDeck': 'Main Deck',
        'zone.evolveDeck': 'Evolve Deck',
        'zone.field': 'Field',
        'zone.exArea': 'EX Area',
        'zone.cemetery': 'Cemetery',
        'zone.banish': 'Banish',
        'zone.hand': 'Hand',
        'zone.leader': 'Leader',
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}));

vi.mock('./Card', () => ({
  default: ({ card, isHidden, isLocked, debugIndex, hideCurrentStats, displayCounters, baseStats, onSendToBottom, onBanish, onCemetery, onReturnEvolve }: { card: CardInstance; isHidden?: boolean; isLocked?: boolean; debugIndex?: number; hideCurrentStats?: boolean; displayCounters?: { atk: number; hp: number }; baseStats?: { atk: number; hp: number }; onSendToBottom?: (id: string) => void; onBanish?: (id: string) => void; onCemetery?: (id: string) => void; onReturnEvolve?: (id: string) => void }) => (
    <div
      data-testid="mock-card"
      data-card-id={card.id}
      data-hidden={String(Boolean(isHidden))}
      data-locked={String(Boolean(isLocked))}
      data-debug-index={debugIndex ?? ''}
      data-hide-current-stats={String(Boolean(hideCurrentStats))}
      data-display-counters={displayCounters ? `${displayCounters.atk}/${displayCounters.hp}` : ''}
      data-base-stats={baseStats ? `${baseStats.atk}/${baseStats.hp}` : ''}
      data-has-send-to-bottom={String(Boolean(onSendToBottom))}
      data-has-banish={String(Boolean(onBanish))}
      data-has-cemetery={String(Boolean(onCemetery))}
      data-has-return-evolve={String(Boolean(onReturnEvolve))}
    >
      {card.name}
    </div>
  ),
}));

const createCard = (id: string, overrides: Partial<CardInstance> = {}): CardInstance => ({
  id,
  cardId: id,
  name: `Card ${id}`,
  image: '',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

const renderWithInputProfile = (
  profile: 'fine' | 'coarse',
  ui: React.ReactElement,
  boardDensity: 'standard' | 'overview' = 'standard'
) => render(
  <GameBoardInputProfileProvider value={profile} boardDensity={boardDensity}>
    {ui}
  </GameBoardInputProfileProvider>
);

describe('Zone', () => {
  beforeEach(() => {
    droppableState.isOver = false;
  });

  it('renders top-level cards and nested attachments without hiding orphan cards', () => {
    render(
      <Zone
        id="field-host"
        label="Field"
        cards={[
          createCard('parent'),
          createCard('child', { attachedTo: 'parent' }),
          createCard('orphan', { attachedTo: 'missing-parent' }),
        ]}
      />
    );

    const renderedCards = screen.getAllByTestId('mock-card');
    expect(renderedCards).toHaveLength(3);
    expect(screen.getByText('Field (2)')).toBeInTheDocument();
    expect(renderedCards.map(card => card.getAttribute('data-card-id'))).toEqual(['parent', 'child', 'orphan']);
  });

  it('passes hidden, locked, and debug props to child cards in stack mode', () => {
    render(
      <Zone
        id="deck-host"
        label="Deck"
        layout="stack"
        hideCards={true}
        isProtected={true}
        viewerRole="host"
        isDebug={true}
        cards={[
          createCard('host-card', { owner: 'host' }),
          createCard('guest-card', { owner: 'guest' }),
        ]}
      />
    );

    const cards = screen.getAllByTestId('mock-card');
    expect(cards[0]).toHaveAttribute('data-hidden', 'true');
    expect(cards[0]).toHaveAttribute('data-locked', 'false');
    expect(cards[0]).toHaveAttribute('data-debug-index', '0');
    expect(cards[1]).toHaveAttribute('data-hidden', 'true');
    expect(cards[1]).toHaveAttribute('data-locked', 'true');
    expect(cards[1]).toHaveAttribute('data-debug-index', '1');
  });

  it('renders attachments in horizontal layout and highlights the drop target', () => {
    droppableState.isOver = true;
    const { container } = render(
      <Zone
        id="field-host"
        label="Field"
        cards={[
          createCard('parent'),
          createCard('attachment-1', { attachedTo: 'parent' }),
          createCard('attachment-2', { attachedTo: 'parent' }),
        ]}
      />
    );

    const cards = screen.getAllByTestId('mock-card');
    expect(cards.map(card => card.getAttribute('data-card-id'))).toEqual(['parent', 'attachment-1', 'attachment-2']);
    expect(container.firstChild).toHaveStyle({
      backgroundColor: 'rgba(0, 208, 132, 0.1)',
    });
    droppableState.isOver = false;
  });

  it('strips player prefixes from labels and unlocks all cards for all-view mode', () => {
    render(
      <Zone
        id="field-all"
        label="Player 1 Field"
        viewerRole="all"
        isProtected={true}
        containerStyle={{ minHeight: '220px' }}
        cardStatLookup={{ parent: { atk: 2, hp: 3 } }}
        cards={[
          createCard('parent', { owner: 'guest' }),
          createCard('attachment', { owner: 'guest', attachedTo: 'parent', counters: { atk: 1, hp: -1 } }),
        ]}
      />
    );

    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    const cards = screen.getAllByTestId('mock-card');
    expect(cards[0]).toHaveAttribute('data-locked', 'false');
    expect(cards[0]).toHaveAttribute('data-hide-current-stats', 'true');
    expect(cards[0]).toHaveAttribute('data-base-stats', '2/3');
    expect(cards[1]).toHaveAttribute('data-display-counters', '1/-1');
  });

  it('shows but locks every card for spectator view, including the viewed player own cards', () => {
    render(
      <Zone
        id="field-host"
        label="Player 1 Field"
        viewerRole="spectator"
        cards={[
          createCard('host-card', { owner: 'host' }),
          createCard('guest-card', { owner: 'guest' }),
        ]}
      />
    );

    expect(screen.getByText('Field')).toBeInTheDocument();

    const cards = screen.getAllByTestId('mock-card');
    expect(cards[0]).toHaveAttribute('data-hidden', 'false');
    expect(cards[0]).toHaveAttribute('data-locked', 'true');
    expect(cards[1]).toHaveAttribute('data-hidden', 'false');
    expect(cards[1]).toHaveAttribute('data-locked', 'true');
  });

  it('does not count linked cards as top-level field cards', () => {
    render(
      <Zone
        id="field-host"
        label="Field"
        cards={[
          createCard('parent'),
          createCard('linked-special', { linkedTo: 'parent', isEvolveCard: true }),
        ]}
      />
    );

    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    const renderedCards = screen.getAllByTestId('mock-card');
    expect(renderedCards.map(card => card.getAttribute('data-card-id'))).toEqual(['parent', 'linked-special']);
  });

  it('renders linked cards below existing attachments on the same parent', () => {
    render(
      <Zone
        id="field-host"
        label="Field"
        cards={[
          createCard('parent'),
          createCard('evolve', { attachedTo: 'parent', isEvolveCard: true }),
          createCard('linked-special', { linkedTo: 'parent', isEvolveCard: true }),
        ]}
      />
    );

    const linkedCard = screen.getAllByTestId('mock-card').find(card => card.getAttribute('data-card-id') === 'linked-special');
    expect(linkedCard?.parentElement).toHaveStyle({
      top: '40px',
      left: '30px',
    });
  });

  it('passes individual removal actions to linked cards', () => {
    render(
      <Zone
        id="field-host"
        label="Field"
        cards={[
          createCard('parent'),
          createCard('linked-special', { linkedTo: 'parent', isTokenCard: true }),
        ]}
        onSendToBottom={vi.fn()}
        onBanish={vi.fn()}
        onCemetery={vi.fn()}
      />
    );

    const linkedCard = screen.getAllByTestId('mock-card').find(card => card.getAttribute('data-card-id') === 'linked-special');
    expect(linkedCard).toHaveAttribute('data-has-send-to-bottom', 'true');
    expect(linkedCard).toHaveAttribute('data-has-banish', 'true');
    expect(linkedCard).toHaveAttribute('data-has-cemetery', 'true');
  });

  it('does not pass token-only removal actions to non-token linked cards', () => {
    render(
      <Zone
        id="field-host"
        label="Field"
        cards={[
          createCard('parent'),
          createCard('linked-special', { linkedTo: 'parent', isEvolveCard: true }),
        ]}
        onSendToBottom={vi.fn()}
        onBanish={vi.fn()}
        onCemetery={vi.fn()}
        onReturnEvolve={vi.fn()}
      />
    );

    const linkedCard = screen.getAllByTestId('mock-card').find(card => card.getAttribute('data-card-id') === 'linked-special');
    expect(linkedCard).toHaveAttribute('data-has-send-to-bottom', 'false');
    expect(linkedCard).toHaveAttribute('data-has-banish', 'false');
    expect(linkedCard).toHaveAttribute('data-has-cemetery', 'false');
    expect(linkedCard).toHaveAttribute('data-has-return-evolve', 'true');
  });

  it('uses tighter field spacing for coarse input', () => {
    const { container } = renderWithInputProfile(
      'coarse',
      <Zone
        id="field-host"
        label="Field"
        cards={[createCard('host-card')]}
      />
    );

    expect(container.firstChild).toHaveStyle({ gap: '1.14rem' });
  });

  it('uses scaled field spacing in desktop overview mode without switching to coarse input', () => {
    const { container } = renderWithInputProfile(
      'fine',
      <Zone
        id="field-host"
        label="Field"
        cards={[createCard('host-card')]}
      />,
      'overview'
    );

    expect(container.firstChild).toHaveStyle({ gap: '1.9rem' });
  });

  it('uses compact zone label typography for coarse input', () => {
    const { container } = renderWithInputProfile(
      'coarse',
      <Zone
        id="field-host"
        label="Opponent Cemetery"
        cards={[createCard('host-card')]}
      />
    );

    expect(container.firstChild).toHaveStyle({ padding: '0.32rem' });
    const zoneLabel = screen.getByText('Cemetery');
    expect(zoneLabel).toHaveStyle({ fontSize: '0.48rem' });
    expect(zoneLabel).toHaveStyle({
      whiteSpace: 'normal',
      textOverflow: 'clip',
      overflowWrap: 'normal',
      wordBreak: 'keep-all',
    });
    expect(zoneLabel).toHaveAttribute('title', 'Cemetery');
  });

  it('keeps katakana zone labels from breaking mid-word in coarse input', () => {
    renderWithInputProfile(
      'coarse',
      <Zone
        id="evolve-host"
        label="エボルヴ"
        cards={[createCard('host-card')]}
      />
    );

    const zoneLabel = screen.getByText('エボルヴ');
    expect(zoneLabel).toHaveStyle({
      overflowWrap: 'normal',
      wordBreak: 'keep-all',
    });
  });

  it('uses compact but slightly larger zone label typography on desktop without ellipsis', () => {
    renderWithInputProfile(
      'fine',
      <Zone
        id="evolveDeck-host"
        label="エボルヴデッキ"
        cards={[createCard('host-card', { zone: 'evolveDeck-host' })]}
      />
    );

    const zoneLabel = screen.getByText('エボルヴデッキ');
    expect(zoneLabel).toHaveStyle({
      fontSize: '0.52rem',
      textOverflow: 'clip',
      whiteSpace: 'nowrap',
    });
    expect(screen.getByText('1')).toHaveStyle({ fontSize: '0.46rem' });
  });

  it('lowers floating zone label chrome on desktop to reduce overlap with nearby buttons', () => {
    renderWithInputProfile(
      'fine',
      <Zone
        id="field-host"
        label="Field"
        cards={[createCard('host-card')]}
      />
    );

    const zoneLabel = screen.getByText('Field');
    expect(zoneLabel.parentElement).toHaveStyle({ top: '-6px' });
  });

  it('uses tighter zone label chrome in desktop overview so evolve labels fit more naturally', () => {
    renderWithInputProfile(
      'fine',
      <Zone
        id="evolveDeck-host"
        label="エボルヴ"
        cards={[createCard('host-card', { zone: 'evolveDeck-host' })]}
      />,
      'overview'
    );

    const zoneLabel = screen.getByText('エボルヴ');
    expect(zoneLabel).toHaveStyle({
      fontSize: '0.52rem',
      textOverflow: 'clip',
      whiteSpace: 'nowrap',
    });
    expect(screen.getByText('1')).toHaveStyle({ fontSize: '0.46rem' });
  });
});
