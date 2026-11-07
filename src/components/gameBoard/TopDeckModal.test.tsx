import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TopDeckModal, { type TopDeckAction } from './TopDeckModal';
import type { CardInstance } from '../Card';
import type { CardDetail } from '../../utils/card/cardDetails';

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

const createCardDetail = (id: string): CardDetail => ({
  id,
  name: `Detailed ${id}`,
  image: `/${id}.png`,
  className: 'Elf',
  title: 'Forestcraft',
  type: 'Follower',
  subtype: 'Fairy',
  cost: '2',
  atk: 2,
  hp: 3,
  abilityText: '[Fanfare] Draw a card.',
});

describe('TopDeckModal', () => {
  it('shows destination controls above the reference hand and outside scrollable cards only while selected', () => {
    render(<TopDeckModal isOpen cards={[createCard('c1'), createCard('c2')]} handCards={[createCard('h1')]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const content = screen.getByTestId('top-deck-content');
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    const hand = screen.getByRole('button', { name: 'Hand' });
    expect(hand).toBeEnabled();
    expect(content).not.toContainElement(hand);
    const controls = screen.getByTestId('top-deck-destination-actions');
    const referenceHand = screen.getByRole('button', { name: /Your Hand/ });
    expect(controls.compareDocumentPosition(referenceHand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Move 1 selected card(s) to:')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hand' }));
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    expect(content).not.toContainElement(screen.getByRole('button', { name: 'Cemetery' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cemetery' }));
    expect(screen.getByRole('heading', { name: /Cemetery/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
  });

  it('uses the same card dimensions for every assigned destination', () => {
    const destinations = ['Field', 'Hand', 'Reveal to Hand', 'EX Area', 'Bottom of Deck', 'Top of Deck', 'Cemetery'];
    render(<TopDeckModal isOpen cards={destinations.map((_, index) => createCard(`c${index}`))} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    destinations.forEach((destination, index) => {
      fireEvent.click(screen.getByRole('button', { name: `Card c${index}` }));
      fireEvent.click(screen.getByRole('button', { name: destination }));
      expect(screen.getByAltText(`Card c${index}`)).toHaveStyle({ width: '64px', height: '90px' });
    });
  });

  it('shows only populated destinations and collapses the selection area until an assignment is undone', () => {
    render(<TopDeckModal isOpen cards={[createCard('c1'), createCard('c2')]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /All remaining to/ })).toHaveLength(0);

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByRole('button', { name: 'Hand' }));
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: /Hand/ })).toBeInTheDocument();
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));

    expect(screen.getByText('All cards have been assigned.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cards to be Assigned' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All remaining to bottom' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2);

    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Return to unassigned' }));
    expect(screen.getByRole('heading', { name: 'Cards to be Assigned' })).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /All remaining to/ })).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: /Bottom of Deck/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Randomize bottom order')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hand/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));
    expect(screen.getByRole('heading', { name: /Top of Deck/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('selects without moving, supports deselection, and sends cards to bottom in selection order without bulk buttons', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<TopDeckModal isOpen cards={[createCard('c1'), createCard('c2'), createCard('c3')]} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.queryAllByRole('button', { name: /All remaining to/ })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByAltText('Card c1'));
    expect(screen.getByRole('button', { name: 'Card c1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('3 cards remaining to assign')).toBeInTheDocument();
    fireEvent.click(screen.getByAltText('Card c1'));
    expect(screen.queryByRole('button', { name: 'Hand' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByRole('button', { name: 'Hand' }));
    fireEvent.click(screen.getByAltText('Card c3'));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c1', action: 'hand', order: undefined },
      { cardId: 'c3', action: 'bottom', order: 1 },
      { cardId: 'c2', action: 'bottom', order: 2 },
    ]);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('cancels after private and revealed assignments without applying results or changing the source cards', () => {
    const cards = [createCard('c1'), createCard('c2')];
    const originalCards = structuredClone(cards);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<TopDeckModal isOpen cards={cards} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal to Hand' }));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(cards).toEqual(originalCards);
  });

  it('undoes a mistaken batch with no selected cards and allows explicit reselection without confirming early', () => {
    const onConfirm = vi.fn();
    render(<TopDeckModal isOpen cards={[createCard('c1'), createCard('c2'), createCard('c3')]} onConfirm={onConfirm} onCancel={vi.fn()} />);
    const retryButton = screen.getByRole('button', { name: 'Undo last assignment' });
    expect(retryButton).toBeDisabled();
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Hand' }));
    fireEvent.click(screen.getByAltText('Card c3'));
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByRole('button', { name: 'Cemetery' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(retryButton).toBeEnabled();

    fireEvent.click(retryButton);
    expect(retryButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Card c3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Card c1' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('top-deck-destination-actions')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hand/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Cemetery/ })).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Card c3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c2', action: 'hand', order: undefined },
      { cardId: 'c3', action: 'bottom', order: 1 },
      { cardId: 'c1', action: 'bottom', order: 2 },
    ]);
  });

  it('directly changes an older assigned batch and retries back to its original destination without affecting later assignments', () => {
    const onConfirm = vi.fn();
    render(<TopDeckModal isOpen cards={[createCard('c1'), createCard('c2'), createCard('c3')]} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Cemetery' }));
    fireEvent.click(screen.getByAltText('Card c3'));
    fireEvent.click(screen.getByRole('button', { name: 'Hand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Card c2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    const cemetery = screen.getByRole('heading', { name: /Cemetery/ }).parentElement!;
    expect(within(cemetery).getByRole('button', { name: 'Card c2' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(cemetery).getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Cards to be Assigned' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
    expect(screen.queryByRole('heading', { name: /Cemetery/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Hand/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo last assignment' }));
    expect(screen.getByRole('heading', { name: /Cemetery/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Bottom of Deck/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Card c2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Card c1' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(screen.queryByTestId('top-deck-destination-actions')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Card c2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Card c1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c3', action: 'hand', order: undefined },
      { cardId: 'c2', action: 'bottom', order: 1 },
      { cardId: 'c1', action: 'bottom', order: 2 },
    ]);
  });

  it('keeps selection separate from deck-order arrow controls', () => {
    render(<TopDeckModal isOpen cards={[createCard('c1'), createCard('c2'), createCard('c3')]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    for (const id of ['c1', 'c2', 'c3']) fireEvent.click(screen.getByAltText(`Card ${id}`));
    fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Card c2' }));
    fireEvent.click(screen.getByLabelText('Move Top of Deck order backward for Card c3'));
    expect(screen.getByRole('button', { name: 'Card c2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Card c3' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Card c2' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

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

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));

    expect(screen.getByText('All cards have been assigned.')).toBeInTheDocument();
    expect(confirmButton).toBeEnabled();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(document.querySelector('img[src="/c1.png"]') as Element);
    fireEvent.click(screen.getByRole('button', { name: 'Return to unassigned' }));
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.queryByText('2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Field' }));
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

  it('keeps in-progress assignments when cards update with the same IDs while open', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1'), createCard('c2')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));

    rerender(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1'), createCard('c2')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('1 cards remaining to assign')).toBeInTheDocument();

    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c1', action: 'bottom', order: 1 },
      { cardId: 'c2', action: 'bottom', order: 2 },
    ]);
  });

  it.each<[string, TopDeckAction]>([
    ['Field', 'field'], ['Hand', 'hand'], ['Reveal to Hand', 'revealedHand'],
    ['EX Area', 'ex'], ['Cemetery', 'cemetery'],
  ])('assigns selected cards to %s', (label, action) => {
    const onConfirm = vi.fn();
    render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1')]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c1', action, order: undefined },
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

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByAltText('Card c3'));
    fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));

    fireEvent.click(screen.getByLabelText('Move Bottom of Deck order forward for Card c1'));
    fireEvent.click(screen.getByLabelText('Move Bottom of Deck order forward for Card c1'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c2', action: 'bottom', order: 1 },
      { cardId: 'c3', action: 'bottom', order: 2 },
      { cardId: 'c1', action: 'bottom', order: 3 },
    ]);
  });

  it('randomizes only bottom cards when confirming with the randomize option enabled', () => {
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.1);
    const onConfirm = vi.fn();

    try {
      render(
        <TopDeckModal
          isOpen={true}
          cards={[createCard('c1'), createCard('c2'), createCard('c3'), createCard('c4')]}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByAltText('Card c1'));
      fireEvent.click(screen.getByAltText('Card c2'));
      fireEvent.click(screen.getByAltText('Card c3'));
      fireEvent.click(screen.getByRole('button', { name: 'Bottom of Deck' }));
      fireEvent.click(screen.getByLabelText('Randomize bottom order'));

      fireEvent.click(screen.getByAltText('Card c4'));
      fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));
      fireEvent.click(screen.getByText('Confirm'));

      expect(onConfirm).toHaveBeenCalledWith([
        { cardId: 'c4', action: 'top', order: 1 },
        { cardId: 'c2', action: 'bottom', order: 1 },
        { cardId: 'c1', action: 'bottom', order: 2 },
        { cardId: 'c3', action: 'bottom', order: 3 },
      ]);
    } finally {
      randomSpy.mockRestore();
    }
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

    fireEvent.click(screen.getByAltText('Card c1'));
    fireEvent.click(screen.getByAltText('Card c2'));
    fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));

    fireEvent.click(screen.getByAltText('Card c3'));
    fireEvent.click(screen.getByRole('button', { name: 'Field' }));

    const backwardButton = screen.getByLabelText('Move Top of Deck order backward for Card c2');
    expect(screen.getByLabelText('Move Top of Deck order backward for Card c1')).toBeDisabled();

    fireEvent.click(backwardButton);
    fireEvent.click(document.querySelector('img[src="/c2.png"]') as Element);
    fireEvent.click(screen.getByRole('button', { name: 'Return to unassigned' }));
    fireEvent.click(screen.getByRole('button', { name: 'Top of Deck' }));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith([
      { cardId: 'c3', action: 'field', order: undefined },
      { cardId: 'c1', action: 'top', order: 1 },
      { cardId: 'c2', action: 'top', order: 2 },
    ]);
  });

  it('shows card details while hovering top-deck cards', () => {
    render(
      <TopDeckModal
        isOpen={true}
        cards={[createCard('c1')]}
        cardDetailLookup={{ c1: createCardDetail('c1') }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cardImage = screen.getByAltText('Card c1');
    fireEvent.mouseEnter(cardImage, { clientX: 120, clientY: 140 });

    const preview = screen.getByTestId('top-deck-hover-preview');
    expect(preview).toHaveTextContent('Detailed c1');
    expect(preview).toHaveTextContent('Elf / Forestcraft');
    expect(preview).toHaveTextContent('Follower / Fairy');
    expect(preview).toHaveTextContent('2 / 3');
    expect(preview).toHaveTextContent('[Fanfare] Draw a card.');

    fireEvent.mouseLeave(cardImage);

    expect(screen.queryByTestId('top-deck-hover-preview')).not.toBeInTheDocument();
  });
});
