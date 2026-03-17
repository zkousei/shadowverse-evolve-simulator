import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Card, { type CardInstance } from './Card';

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
  }),
  useDroppable: () => ({
    isOver: false,
    setNodeRef: vi.fn(),
  }),
}));

const createCard = (overrides: Partial<CardInstance> = {}): CardInstance => ({
  id: 'card-1',
  cardId: 'BP01-001',
  name: 'Test Card',
  image: '/test-card.png',
  zone: 'field-host',
  owner: 'host',
  isTapped: false,
  isFlipped: false,
  counters: { atk: 1, hp: 2 },
  ...overrides,
});

describe('Card', () => {
  it('renders the card back when hidden or flipped', () => {
    const { rerender } = render(<Card card={createCard()} isHidden={true} />);
    expect(screen.getByAltText('Card Back')).toBeInTheDocument();
    expect(screen.queryByAltText('Test Card')).not.toBeInTheDocument();

    rerender(<Card card={createCard({ isFlipped: true })} />);
    expect(screen.getByAltText('Card Back')).toBeInTheDocument();
  });

  it('fires quick actions for visible unlocked cards', () => {
    const onTap = vi.fn();
    const onModifyCounter = vi.fn();
    const onSendToBottom = vi.fn();
    const onBanish = vi.fn();
    const onReturnEvolve = vi.fn();
    const onCemetery = vi.fn();

    render(
      <Card
        card={createCard({ isEvolveCard: true })}
        onTap={onTap}
        onModifyCounter={onModifyCounter}
        onSendToBottom={onSendToBottom}
        onBanish={onBanish}
        onReturnEvolve={onReturnEvolve}
        onCemetery={onCemetery}
      />
    );

    fireEvent.click(screen.getByText('+A'));
    fireEvent.click(screen.getByText('-H'));
    fireEvent.click(screen.getByText('↓Bot'));
    fireEvent.click(screen.getByText('Cemetery'));
    fireEvent.click(screen.getByText('Banish'));
    fireEvent.click(screen.getByText('To Evolve Deck'));
    fireEvent.click(screen.getByText('REST'));
    fireEvent.contextMenu(screen.getByAltText('Test Card').closest('.game-card') as HTMLElement);

    expect(onModifyCounter).toHaveBeenNthCalledWith(1, 'card-1', 'atk', 1);
    expect(onModifyCounter).toHaveBeenNthCalledWith(2, 'card-1', 'hp', -1);
    expect(onSendToBottom).toHaveBeenCalledWith('card-1');
    expect(onCemetery).toHaveBeenCalledWith('card-1');
    expect(onBanish).toHaveBeenCalledWith('card-1');
    expect(onReturnEvolve).toHaveBeenCalledWith('card-1');
    expect(onTap).toHaveBeenCalledTimes(2);
    expect(onTap).toHaveBeenCalledWith('card-1');
  });

  it('shows the hand-only action and hides controls when locked', () => {
    const onPlayToField = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'hand-host', counters: { atk: 0, hp: 0 } })}
        onPlayToField={onPlayToField}
      />
    );

    fireEvent.click(screen.getByText('Play to Field'));
    expect(onPlayToField).toHaveBeenCalledWith('card-1');
    expect(screen.queryByText('+A')).not.toBeInTheDocument();

    rerender(
      <Card
        card={createCard({ zone: 'hand-host', counters: { atk: 0, hp: 0 } })}
        onPlayToField={onPlayToField}
        isLocked={true}
      />
    );

    expect(screen.queryByText('Play to Field')).not.toBeInTheDocument();
  });

  it('shows current stats for field cards when base stats are available', () => {
    render(
      <Card
        card={createCard({ counters: { atk: 1, hp: -1 } })}
        baseStats={{ atk: 3, hp: 4 }}
      />
    );

    expect(screen.getByTestId('current-stats-badge')).toHaveTextContent('4/3');
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('does not show current stats for hand cards even if base stats are available', () => {
    render(
      <Card
        card={createCard({ zone: 'hand-host', counters: { atk: 1, hp: -1 } })}
        baseStats={{ atk: 3, hp: 4 }}
      />
    );

    expect(screen.queryByTestId('current-stats-badge')).not.toBeInTheDocument();
  });

  it('renders inherited display counters for attached evolve cards', () => {
    render(
      <Card
        card={createCard({ zone: 'field-host', counters: { atk: 1, hp: 0 } })}
        baseStats={{ atk: 4, hp: 5 }}
        displayCounters={{ atk: 3, hp: -1 }}
      />
    );

    expect(screen.getByTestId('current-stats-badge')).toHaveTextContent('7/4');
  });

  it('hides current stats when the card is underneath a stack', () => {
    render(
      <Card
        card={createCard()}
        baseStats={{ atk: 3, hp: 4 }}
        hideCurrentStats={true}
      />
    );

    expect(screen.queryByTestId('current-stats-badge')).not.toBeInTheDocument();
  });
});
