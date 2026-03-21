import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Zone from './Zone';
import type { CardInstance } from './Card';

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
  default: ({ card, isHidden, isLocked, debugIndex, hideCurrentStats, displayCounters, baseStats }: { card: CardInstance; isHidden?: boolean; isLocked?: boolean; debugIndex?: number; hideCurrentStats?: boolean; displayCounters?: { atk: number; hp: number }; baseStats?: { atk: number; hp: number } }) => (
    <div
      data-testid="mock-card"
      data-card-id={card.id}
      data-hidden={String(Boolean(isHidden))}
      data-locked={String(Boolean(isLocked))}
      data-debug-index={debugIndex ?? ''}
      data-hide-current-stats={String(Boolean(hideCurrentStats))}
      data-display-counters={displayCounters ? `${displayCounters.atk}/${displayCounters.hp}` : ''}
      data-base-stats={baseStats ? `${baseStats.atk}/${baseStats.hp}` : ''}
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
});
