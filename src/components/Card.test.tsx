import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Card, { type CardInstance } from './Card';

const dndState = {
  transform: null as null | { x: number; y: number },
  isOver: false,
};

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: dndState.transform,
  }),
  useDroppable: () => ({
    isOver: dndState.isOver,
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
  it('rotates tapped cards and combines rotation with drag transform', () => {
    const { rerender } = render(<Card card={createCard({ isTapped: true })} />);
    expect(screen.getByAltText('Test Card').closest('.game-card')).toHaveStyle({ transform: 'rotate(90deg)' });

    dndState.transform = { x: 10, y: 20 };
    rerender(<Card card={createCard({ isTapped: true })} />);
    expect(screen.getByAltText('Test Card').closest('.game-card')).toHaveStyle({
      transform: 'translate3d(10px, 20px, 0) rotate(90deg)',
      transition: 'none',
    });
    dndState.transform = null;
  });

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
    fireEvent.click(screen.getByText('-A'));
    fireEvent.click(screen.getByText('+H'));
    fireEvent.click(screen.getByText('-H'));
    fireEvent.click(screen.getByText('Bot'));
    fireEvent.click(screen.getByText('Cem'));
    fireEvent.click(screen.getByText('Ban'));
    fireEvent.click(screen.getByText('Evolve'));
    fireEvent.click(screen.getByText('REST'));
    fireEvent.contextMenu(screen.getByAltText('Test Card').closest('.game-card') as HTMLElement);

    expect(onModifyCounter).toHaveBeenNthCalledWith(1, 'card-1', 'atk', 1);
    expect(onModifyCounter).toHaveBeenNthCalledWith(2, 'card-1', 'atk', -1);
    expect(onModifyCounter).toHaveBeenNthCalledWith(3, 'card-1', 'hp', 1);
    expect(onModifyCounter).toHaveBeenNthCalledWith(4, 'card-1', 'hp', -1);
    expect(onSendToBottom).toHaveBeenCalledWith('card-1');
    expect(onCemetery).toHaveBeenCalledWith('card-1');
    expect(onBanish).toHaveBeenCalledWith('card-1');
    expect(onReturnEvolve).toHaveBeenCalledWith('card-1');
    expect(onTap).toHaveBeenCalledTimes(2);
    expect(onTap).toHaveBeenCalledWith('card-1');
  });

  it('keeps quick-action buttons compact while exposing descriptive labels', () => {
    render(
      <Card
        card={createCard({ isEvolveCard: true })}
        onSendToBottom={vi.fn()}
        onBanish={vi.fn()}
        onReturnEvolve={vi.fn()}
        onCemetery={vi.fn()}
      />
    );

    expect(screen.getByText('Bot')).toHaveAttribute('title', 'Send to bottom of deck');
    expect(screen.getByText('Cem')).toHaveAttribute('aria-label', 'Send to cemetery');
    expect(screen.getByText('Ban')).toHaveAttribute('title', 'Banish this card');
    expect(screen.getByText('Evolve')).toHaveAttribute('aria-label', 'Return to evolve deck');
  });

  it('fires generic counter quick actions for field cards', () => {
    const onModifyGenericCounter = vi.fn();

    render(
      <Card
        card={createCard()}
        onModifyGenericCounter={onModifyGenericCounter}
      />
    );

    fireEvent.click(screen.getByText('+C'));
    fireEvent.click(screen.getByText('-C'));

    expect(onModifyGenericCounter).toHaveBeenNthCalledWith(1, 'card-1', 1);
    expect(onModifyGenericCounter).toHaveBeenNthCalledWith(2, 'card-1', -1);
  });

  it('hides combat and counter controls for lower stacked cards while keeping move shortcuts', () => {
    const onTap = vi.fn();
    const onAttack = vi.fn();
    const onModifyCounter = vi.fn();
    const onModifyGenericCounter = vi.fn();
    const onSendToBottom = vi.fn();
    const onBanish = vi.fn();
    const onCemetery = vi.fn();

    render(
      <Card
        card={createCard()}
        onTap={onTap}
        onAttack={onAttack}
        onModifyCounter={onModifyCounter}
        onModifyGenericCounter={onModifyGenericCounter}
        onSendToBottom={onSendToBottom}
        onBanish={onBanish}
        onCemetery={onCemetery}
        disableCombatAndCounterControls={true}
      />
    );

    expect(screen.queryByText('REST')).not.toBeInTheDocument();
    expect(screen.queryByText('Attack')).not.toBeInTheDocument();
    expect(screen.queryByText('+A')).not.toBeInTheDocument();
    expect(screen.queryByText('-A')).not.toBeInTheDocument();
    expect(screen.queryByText('+H')).not.toBeInTheDocument();
    expect(screen.queryByText('-H')).not.toBeInTheDocument();
    expect(screen.queryByText('+C')).not.toBeInTheDocument();
    expect(screen.queryByText('-C')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Bot'));
    fireEvent.click(screen.getByText('Cem'));
    fireEvent.click(screen.getByText('Ban'));
    fireEvent.contextMenu(screen.getByAltText('Test Card').closest('.game-card') as HTMLElement);

    expect(onSendToBottom).toHaveBeenCalledWith('card-1');
    expect(onCemetery).toHaveBeenCalledWith('card-1');
    expect(onBanish).toHaveBeenCalledWith('card-1');
    expect(onTap).not.toHaveBeenCalled();
    expect(onAttack).not.toHaveBeenCalled();
    expect(onModifyCounter).not.toHaveBeenCalled();
    expect(onModifyGenericCounter).not.toHaveBeenCalled();
  });

  it('calls inspect handler for visible public cards only', () => {
    const onInspect = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard()}
        onInspect={onInspect}
      />
    );

    fireEvent.pointerDown(screen.getByAltText('Test Card').closest('.game-card') as HTMLElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(screen.getByAltText('Test Card').closest('.game-card') as HTMLElement, { clientX: 10, clientY: 20, button: 0 });
    expect(onInspect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'card-1' }),
      expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
        right: expect.any(Number),
        bottom: expect.any(Number),
      })
    );

    rerender(
      <Card
        card={createCard()}
        onInspect={onInspect}
        isHidden={true}
      />
    );

    fireEvent.pointerDown(screen.getByAltText('Card Back').closest('.game-card') as HTMLElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(screen.getByAltText('Card Back').closest('.game-card') as HTMLElement, { clientX: 10, clientY: 20, button: 0 });
    expect(onInspect).toHaveBeenCalledTimes(1);

    rerender(
      <Card
        card={createCard({ isFlipped: true })}
        onInspect={onInspect}
      />
    );

    fireEvent.pointerDown(screen.getByAltText('Card Back').closest('.game-card') as HTMLElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(screen.getByAltText('Card Back').closest('.game-card') as HTMLElement, { clientX: 10, clientY: 20, button: 0 });
    expect(onInspect).toHaveBeenCalledTimes(1);
  });

  it('clears inspect state on pointer cancel so a later pointer up does not inspect', () => {
    const onInspect = vi.fn();
    render(
      <Card
        card={createCard()}
        onInspect={onInspect}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerCancel(cardElement);
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(onInspect).not.toHaveBeenCalled();
  });

  it('shows the hand-only action and hides controls when locked', () => {
    const onPlayToField = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'hand-host', counters: { atk: 0, hp: 0 } })}
        onPlayToField={onPlayToField}
      />
    );

    fireEvent.pointerDown(screen.getByText('Play to Field'));
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

  it('labels main-deck spells as Play in hand and ex zones', () => {
    const onPlayToField = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'hand-host', counters: { atk: 0, hp: 0 }, baseCardType: 'spell' })}
        onPlayToField={onPlayToField}
      />
    );

    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.queryByText('Play to Field')).not.toBeInTheDocument();

    rerender(
      <Card
        card={createCard({ zone: 'ex-host', counters: { atk: 0, hp: 0 }, baseCardType: 'spell' })}
        onPlayToField={onPlayToField}
      />
    );

    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('labels token spells as Play and token equipment as Play to Field', () => {
    const onPlayToField = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'ex-host', counters: { atk: 0, hp: 0 }, baseCardType: 'spell', isTokenCard: true })}
        onPlayToField={onPlayToField}
      />
    );

    expect(screen.getByText('Play')).toBeInTheDocument();

    rerender(
      <Card
        card={createCard({ zone: 'ex-host', counters: { atk: 0, hp: 0 }, baseCardType: 'amulet', isTokenCard: true })}
        onPlayToField={onPlayToField}
      />
    );

    expect(screen.getByText('Play to Field')).toBeInTheDocument();
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

  it('shows raw counter overlay when current stats are unavailable', () => {
    render(
      <Card
        card={createCard({ counters: { atk: 1, hp: -1 } })}
      />
    );

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('disables quick-action pointer events when requested', () => {
    render(
      <Card
        card={createCard()}
        onCemetery={vi.fn()}
        quickActionsDisabled={true}
      />
    );

    expect(screen.getByTestId('card-controls')).toHaveStyle({ pointerEvents: 'none' });
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

  it('shows current stats for ex area cards but can suppress them when hidden', () => {
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'ex-host', counters: { atk: 2, hp: 0 } })}
        baseStats={{ atk: 5, hp: 6 }}
      />
    );

    expect(screen.getByTestId('current-stats-badge')).toHaveTextContent('7/6');

    rerender(
      <Card
        card={createCard({ zone: 'ex-host', counters: { atk: 2, hp: 0 } })}
        baseStats={{ atk: 5, hp: 6 }}
        isHidden={true}
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

  it('renders a generic counter badge when present', () => {
    render(
      <Card
        card={createCard({ genericCounter: 2 })}
      />
    );

    expect(screen.getByTestId('generic-counter-badge')).toHaveTextContent('Counter2');
  });

  it('hides the generic counter badge for hidden or flipped cards', () => {
    const { rerender } = render(
      <Card
        card={createCard({ genericCounter: 2 })}
        isHidden={true}
      />
    );

    expect(screen.queryByTestId('generic-counter-badge')).not.toBeInTheDocument();

    rerender(
      <Card
        card={createCard({ genericCounter: 2, isFlipped: true })}
      />
    );

    expect(screen.queryByTestId('generic-counter-badge')).not.toBeInTheDocument();
  });

  it('fires the attack action only for ready field cards with base stats', () => {
    const onAttack = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'field-host', isTapped: false })}
        baseStats={{ atk: 3, hp: 4 }}
        onTap={vi.fn()}
        onAttack={onAttack}
      />
    );

    fireEvent.pointerDown(screen.getByText('Attack'));
    fireEvent.click(screen.getByText('Attack'));
    expect(onAttack).toHaveBeenCalledWith('card-1');

    rerender(
      <Card
        card={createCard({ zone: 'field-host', isTapped: true })}
        baseStats={{ atk: 3, hp: 4 }}
        onTap={vi.fn()}
        onAttack={onAttack}
      />
    );
    expect(screen.queryByText('Attack')).not.toBeInTheDocument();
  });

});
