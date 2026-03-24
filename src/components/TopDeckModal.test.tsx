import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TopDeckModal from './TopDeckModal';
import type { CardInstance } from './Card';

const createCard = (id: string): CardInstance => ({
  id,
  cardId: id,
  name: `Card ${id}`,
  image: `/${id}.png`,
  zone: 'mainDeck-host',
  owner: 'host',
  isTapped: false,
  isFlipped: true,
  counters: { atk: 0, hp: 0 },
});

describe('TopDeckModal', () => {
  it('does not render when closed', () => {
    render(
      <TopDeckModal
        isOpen={false}
        cards={[createCard('c1')]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('assigns cards, tracks deck order, and confirms results', () => {
    const onConfirm = vi.fn();
    render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1'), createCard('c2')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getAllByText('Top of Deck')[0]);
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));

    expect(screen.getByText('All cards have been assigned.')).toBeInTheDocument();
    expect(confirmButton).toBeEnabled();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(document.querySelector('img[src="/c1.png"]') as Element);
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.queryByText('2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c2', action: 'top', order: 1 },
      { cardId: 'c1', action: 'top', order: 2 },
    ]);
  });

  it('resets selection state each time the modal opens', () => {
    const { rerender } = render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1')]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByAltText('Card c1'));
    expect(screen.getByText('All cards have been assigned.')).toBeInTheDocument();

    rerender(
      <TopDeckModal
        isOpen={false}
        cards={[createCard('c1')]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    rerender(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1')]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('1 cards remaining to assign')).toBeInTheDocument();
    expect(screen.getByAltText('Card c1')).toBeInTheDocument();
  });

  it('supports assigning cards to revealed hand', () => {
    const onConfirm = vi.fn();
    render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByText('Reveal to Hand')[0]);
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c1', action: 'revealedHand', order: undefined },
    ]);
  });

  it('reorders bottom cards within the assigned bucket', () => {
    const onConfirm = vi.fn();
    render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1'), createCard('c2'), createCard('c3')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByText('Bottom of Deck')[0]);
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByAltText('Card c3'));

    fireEvent.click(screen.getByLabelText('Move Bottom of Deck order forward for Card c1'));
    fireEvent.click(screen.getByLabelText('Move Bottom of Deck order forward for Card c1'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c2', action: 'bottom', order: 1 },
      { cardId: 'c3', action: 'bottom', order: 2 },
      { cardId: 'c1', action: 'bottom', order: 3 },
    ]);
  });

  it('reorders top cards backward and preserves non-deck assignments when unassigning', () => {
    const onConfirm = vi.fn();
    render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1'), createCard('c2'), createCard('c3')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByText('Top of Deck')[0]);
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));

    fireEvent.click(screen.getAllByText('Field')[0]);
    fireEvent.click(screen.getByAltText('Card c3'));

    const backwardButton = screen.getByLabelText('Move Top of Deck order backward for Card c2');
    expect(screen.getByLabelText('Move Top of Deck order backward for Card c1')).toBeDisabled();

    fireEvent.click(backwardButton);
    fireEvent.click(document.querySelector('img[src="/c2.png"]') as Element);
    fireEvent.click(screen.getAllByText('Top of Deck')[0]);
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c3', action: 'field', order: undefined },
      { cardId: 'c1', action: 'top', order: 1 },
      { cardId: 'c2', action: 'top', order: 2 },
    ]);
  });
});
