import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardAttackLineOverlay from './GameBoardAttackLineOverlay';
import GameBoardCoinMessageOverlay from './GameBoardCoinMessageOverlay';
import GameBoardDiceOverlay from './GameBoardDiceOverlay';
import GameBoardGlobalOverlays from './GameBoardGlobalOverlays';
import GameBoardRevealedCardsOverlay from './GameBoardRevealedCardsOverlay';
import GameBoardTransientMessage from './GameBoardTransientMessage';

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

describe('GameBoard extracted UI components - overlays', () => {
  it('renders global overlays host with active overlays', () => {
    render(
      <GameBoardGlobalOverlays
        coinMessage="Host goes first!"
        turnMessage="YOUR TURN"
        cardPlayMessage="Alpha Knight was played."
        attackMessage="Alpha Knight attacks."
        attackLine={{ sourcePoint: { x: 10, y: 20 }, targetPoint: { x: 100, y: 120 } }}
        revealedCardsOverlay={{
          title: 'Revealed Cards',
          cards: [{ cardId: 'TEST-001', name: 'Alpha Knight', image: '/alpha.png' }],
          summaryLines: ['1 card revealed'],
        }}
        cardDetailLookup={{
          'TEST-001': {
            id: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha.png',
            className: 'ロイヤル',
            title: 'Hero Tale',
            type: 'フォロワー',
            subtype: '兵士',
            cardKindNormalized: 'follower',
            cost: '2',
            atk: 2,
            hp: 2,
            abilityText: '',
          },
        }}
        isRollingDice={true}
        diceValue={6}
      />
    );

    expect(screen.getByText('Host goes first!')).toBeInTheDocument();
    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight was played.')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight attacks.')).toBeInTheDocument();
    expect(screen.getByText('Revealed Cards')).toBeInTheDocument();
    expect(screen.getByText('1 card revealed')).toBeInTheDocument();
    expect(screen.getAllByRole('status').some((element) => element.textContent?.includes('6'))).toBe(true);
  });

  it('renders dice overlay with current value', () => {
    render(<GameBoardDiceOverlay value={6} />);

    expect(screen.getByRole('status')).toHaveTextContent('6');
  });

  it('renders coin message overlay text', () => {
    render(<GameBoardCoinMessageOverlay message="Host goes first!" />);

    expect(screen.getByRole('status')).toHaveTextContent('Host goes first!');
  });

  it('renders attack line overlay with source and target coordinates', () => {
    const { container } = render(
      <GameBoardAttackLineOverlay
        sourcePoint={{ x: 10, y: 20 }}
        targetPoint={{ x: 110, y: 220 }}
      />
    );

    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    expect(line).toHaveAttribute('x1', '10');
    expect(line).toHaveAttribute('y1', '20');
    expect(line).toHaveAttribute('x2', '110');
    expect(line).toHaveAttribute('y2', '220');
  });

  it('renders revealed cards overlay with summary lines', () => {
    render(
      <GameBoardRevealedCardsOverlay
        overlay={{
          title: 'Look at Top 3 Cards',
          cards: [
            { cardId: 'TEST-001', name: 'Alpha Knight', image: '/alpha.png' },
          ],
          summaryLines: ['1 to hand', '2 to bottom'],
        }}
        cardDetailLookup={{
          'TEST-001': {
            id: 'TEST-001',
            name: 'Alpha Knight',
            image: '/alpha-detail.png',
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
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Look at Top 3 Cards');
    expect(screen.getByRole('img', { name: 'Alpha Knight' })).toBeInTheDocument();
    expect(screen.getByText('1 to hand')).toBeInTheDocument();
    expect(screen.getByText('2 to bottom')).toBeInTheDocument();
  });

  it('renders transient messages for turn, card play, and attack tones', () => {
    const { rerender } = render(
      <GameBoardTransientMessage
        message="YOUR TURN"
        tone="turn"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('YOUR TURN');

    rerender(
      <GameBoardTransientMessage
        message="Alpha Knight was played."
        tone="card-play"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Alpha Knight was played.');

    rerender(
      <GameBoardTransientMessage
        message="Alpha Knight attacks!"
        tone="attack"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Alpha Knight attacks!');
  });
});
