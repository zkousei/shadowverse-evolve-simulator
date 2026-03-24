import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardSearchModal from './CardSearchModal';
import type { CardInstance } from './Card';

const createCard = (overrides: Partial<CardInstance> = {}): CardInstance => ({
  id: 'card-1',
  cardId: 'BP01-001',
  name: 'Test Card',
  image: '/test.png',
  zone: 'mainDeck-host',
  owner: 'host',
  isTapped: false,
  isFlipped: true,
  counters: { atk: 0, hp: 0 },
  ...overrides,
});

describe('CardSearchModal', () => {
  it('does not show hand or EX extraction buttons for evolve cards', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Evolve Deck"
        zoneId="evolveDeck-host"
        cards={[createCard({ isEvolveCard: true, zone: 'evolveDeck-host' })]}
        onExtractCard={vi.fn()}
        onToggleFlip={vi.fn()}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.getByText('Play to Field')).toBeInTheDocument();
    expect(screen.queryByText('Add to Hand')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to EX Area')).not.toBeInTheDocument();
  });

  it('does not show field extraction for evolve cards during preparation', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Evolve Deck"
        zoneId="evolveDeck-host"
        cards={[createCard({ isEvolveCard: true, zone: 'evolveDeck-host' })]}
        onExtractCard={vi.fn()}
        onToggleFlip={vi.fn()}
        viewerRole="host"
        allowHandExtraction={false}
      />
    );

    expect(screen.queryByText('Play to Field')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to Hand')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to EX Area')).not.toBeInTheDocument();
    expect(screen.getByText('Set USED')).toBeInTheDocument();
  });

  it('shows hand and EX extraction buttons for non-evolve cards', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ isEvolveCard: false, zone: 'mainDeck-host' })]}
        onExtractCard={vi.fn()}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.getByText('Play to Field')).toBeInTheDocument();
    expect(screen.getByText('Add to Hand')).toBeInTheDocument();
    expect(screen.getByText('Reveal & Add to Hand')).toBeInTheDocument();
    expect(screen.getByText('Add to EX Area')).toBeInTheDocument();
  });

  it('only allows face-down field set when searching the main deck during preparation', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ isEvolveCard: false, zone: 'mainDeck-host' })]}
        onExtractCard={vi.fn()}
        viewerRole="host"
        allowHandExtraction={false}
      />
    );

    expect(screen.getByText('Set Face-Down to Field')).toBeInTheDocument();
    expect(screen.queryByText('Add to Hand')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to EX Area')).not.toBeInTheDocument();
    expect(screen.queryByText('Play to Field')).not.toBeInTheDocument();
  });

  it('fires extraction callbacks for available main-deck actions', () => {
    const onExtractCard = vi.fn();
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ isEvolveCard: false, zone: 'mainDeck-host' })]}
        onExtractCard={onExtractCard}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Play to Field'));
    fireEvent.click(screen.getByText('Add to Hand'));
    fireEvent.click(screen.getByText('Reveal & Add to Hand'));
    fireEvent.click(screen.getByText('Add to EX Area'));

    expect(onExtractCard).toHaveBeenNthCalledWith(1, 'card-1', 'field-host');
    expect(onExtractCard).toHaveBeenNthCalledWith(2, 'card-1', 'hand-host');
    expect(onExtractCard).toHaveBeenNthCalledWith(3, 'card-1', 'hand-host', true);
    expect(onExtractCard).toHaveBeenNthCalledWith(4, 'card-1', 'ex-host');
  });

  it('fires evolve-deck usage toggle and shows the unused label when face-up', () => {
    const onToggleFlip = vi.fn();
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="My Evolve Deck"
        zoneId="evolveDeck-host"
        cards={[createCard({ isEvolveCard: true, zone: 'evolveDeck-host', isFlipped: false })]}
        onExtractCard={vi.fn()}
        onToggleFlip={onToggleFlip}
        viewerRole="host"
        allowHandExtraction={false}
      />
    );

    expect(screen.getByText('Set UNUSED')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Set UNUSED'));
    expect(onToggleFlip).toHaveBeenCalledWith('card-1');
  });

  it('hides action controls in read-only mode', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Leader"
        zoneId="leader-host"
        cards={[createCard({ zone: 'leader-host' })]}
        onExtractCard={vi.fn()}
        viewerRole="host"
        readOnly={true}
      />
    );

    expect(screen.queryByText('Play to Field')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to Hand')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to EX Area')).not.toBeInTheDocument();
  });

  it('shows a compact detail popover when a card is clicked', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ name: 'First Card' })]}
        cardDetailLookup={{
          'BP01-001': {
            id: 'BP01-001',
            name: 'First Card',
            image: '/test.png',
            className: 'ロイヤル',
            title: 'Sample',
            type: 'フォロワー',
            subtype: '兵士',
            cost: '2',
            atk: 2,
            hp: 3,
            abilityText: 'Sample ability text',
          },
        }}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    expect(screen.queryByTestId('search-card-detail-popover')).not.toBeInTheDocument();
    fireEvent.click(screen.getByAltText('First Card'));
    expect(screen.getByTestId('search-card-detail-popover')).toHaveTextContent('Sample ability text');
    expect(screen.getByTestId('search-card-grid')).toHaveStyle({ paddingBottom: '1.5rem' });
  });

  it('only reserves extra bottom space for the detail popover when the grid overflows', () => {
    const cards = Array.from({ length: 12 }, (_, index) =>
      createCard({
        id: `card-${index + 1}`,
        name: `Card ${index + 1}`,
      })
    );

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={cards}
        cardDetailLookup={{
          'BP01-001': {
            id: 'BP01-001',
            name: 'Card 1',
            image: '/test.png',
            className: 'ロイヤル',
            title: 'Sample',
            type: 'フォロワー',
            subtype: '兵士',
            cost: '2',
            atk: 2,
            hp: 3,
            abilityText: 'Sample ability text',
          },
        }}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    fireEvent.click(screen.getByAltText('Card 1'));

    const grid = screen.getByTestId('search-card-grid');
    Object.defineProperty(grid, 'scrollHeight', {
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(grid, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    fireEvent(window, new Event('resize'));

    expect(grid).toHaveStyle({ paddingBottom: '11rem' });
  });

  it('closes the detail popover when clicking empty space in the modal', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ name: 'First Card' })]}
        cardDetailLookup={{
          'BP01-001': {
            id: 'BP01-001',
            name: 'First Card',
            image: '/test.png',
            className: 'ロイヤル',
            title: 'Sample',
            type: 'フォロワー',
            subtype: '兵士',
            cost: '2',
            atk: 2,
            hp: 3,
            abilityText: 'Sample ability text',
          },
        }}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    fireEvent.click(screen.getByAltText('First Card'));
    expect(screen.getByTestId('search-card-detail-popover')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('search-card-modal-panel'));
    expect(screen.queryByTestId('search-card-detail-popover')).not.toBeInTheDocument();
  });

  it('does not open the detail popover when using an action button', () => {
    const onExtractCard = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ isEvolveCard: false, zone: 'mainDeck-host' })]}
        cardDetailLookup={{
          'BP01-001': {
            id: 'BP01-001',
            name: 'Test Card',
            image: '/test.png',
            className: 'ロイヤル',
            title: 'Sample',
            type: 'フォロワー',
            subtype: '兵士',
            cost: '2',
            atk: 2,
            hp: 3,
            abilityText: 'Sample ability text',
          },
        }}
        onExtractCard={onExtractCard}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Add to Hand'));

    expect(onExtractCard).toHaveBeenCalledWith('card-1', 'hand-host');
    expect(screen.queryByTestId('search-card-detail-popover')).not.toBeInTheDocument();
  });

});
