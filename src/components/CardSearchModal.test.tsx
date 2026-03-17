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
});
