import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Zone from './Zone';
import type { CardInstance } from './Card';

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    isOver: false,
    setNodeRef: vi.fn(),
  }),
}));

vi.mock('./Card', () => ({
  default: ({ card, isHidden, isLocked, debugIndex }: { card: CardInstance; isHidden?: boolean; isLocked?: boolean; debugIndex?: number }) => (
    <div
      data-testid="mock-card"
      data-card-id={card.id}
      data-hidden={String(Boolean(isHidden))}
      data-locked={String(Boolean(isLocked))}
      data-debug-index={debugIndex ?? ''}
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
    expect(screen.getByText('Field (3)')).toBeInTheDocument();
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
});
