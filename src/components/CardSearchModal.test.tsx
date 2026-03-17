import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Add to EX Area')).toBeInTheDocument();
  });
});
