import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardHandRevealDialog from './GameBoardHandRevealDialog';
import type { CardInstance } from './Card';

vi.mock('./CardArtwork', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const makeCard = (id: string): CardInstance => ({
  id,
  cardId: id,
  name: `Card ${id}`,
  image: `/${id}.png`,
  zone: 'hand-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 0, hp: 0 },
});

describe('GameBoardHandRevealDialog', () => {
  it('keeps the card picker panel scrollable for large hands', () => {
    render(
      <GameBoardHandRevealDialog
        title="Reveal Selected Hand Cards"
        instructions="Choose cards"
        cards={Array.from({ length: 12 }, (_, index) => makeCard(String(index + 1)))}
        selectedCardIds={[]}
        cardDetailLookup={{}}
        cancelLabel="Cancel"
        confirmLabel="Reveal Selected"
        onToggleCard={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('hand-reveal-dialog-panel')).toHaveStyle({
      maxHeight: '88vh',
      overflowY: 'auto',
    });
  });
});
