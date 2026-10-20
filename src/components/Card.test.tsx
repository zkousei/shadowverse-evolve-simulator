import { GameBoardMultiSelectionContext } from '../contexts/gameBoardMultiSelectionContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Card, { type CardInstance } from './Card';
import GameBoardInputProfileProvider from '../contexts/GameBoardInputProfileProvider';
import type { CardDetail } from '../utils/card/cardDetails';

const dndState = {
  transform: null as null | { x: number; y: number },
  isOver: false,
  isDragging: false,
};

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: dndState.transform,
    isDragging: dndState.isDragging,
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

const renderWithInputProfile = (
  profile: 'fine' | 'coarse',
  ui: React.ReactElement,
  boardDensity: 'standard' | 'overview' = 'standard'
) => render(
  <GameBoardInputProfileProvider value={profile} boardDensity={boardDensity}>
    {ui}
  </GameBoardInputProfileProvider>
);

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

  it('uses the selected face image only while the card is visible', () => {
    const detail: CardDetail = {
      id: 'BP08-003',
      name: 'Front Face',
      image: '/front.png',
      className: 'エルフ',
      title: '',
      type: 'フォロワー・エボルヴ',
      subtype: '人形・光輝',
      cardKindNormalized: 'evolve_follower',
      cost: '-',
      atk: 3,
      hp: 3,
      abilityText: '',
      faces: [
        {
          side: 'front',
          name: 'Front Face',
          image: '/front.png',
          className: 'エルフ',
          title: '',
          type: 'フォロワー・エボルヴ',
          subtype: '人形・光輝',
          cardKindNormalized: 'evolve_follower',
          cost: '-',
          atk: 3,
          hp: 3,
          abilityText: '',
        },
        {
          side: 'back',
          name: 'Back Face',
          image: '/back.png',
          className: 'エルフ',
          title: '',
          type: 'フォロワー・エボルヴ',
          subtype: '人形・キラー',
          cardKindNormalized: 'evolve_follower',
          cost: '-',
          atk: 4,
          hp: 4,
          abilityText: '',
        },
      ],
    };

    const { rerender } = render(
      <Card
        card={createCard({ cardId: 'BP08-003', selectedFaceSide: 'back' })}
        detail={detail}
      />
    );

    expect(screen.getByAltText('Test Card')).toHaveAttribute('src', '/back.png');

    rerender(
      <Card
        card={createCard({ cardId: 'BP08-003', selectedFaceSide: 'back', isFlipped: true })}
        detail={detail}
      />
    );

    expect(screen.getByAltText('Card Back')).toHaveAttribute('src', '/card_back.png');
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

  it('keeps counter buttons easier to press without triggering card inspection', () => {
    const onInspect = vi.fn();
    const onModifyCounter = vi.fn();

    render(
      <Card
        card={createCard()}
        onInspect={onInspect}
        onModifyCounter={onModifyCounter}
      />
    );

    const atkIncreaseButton = screen.getByText('+A');
    expect(atkIncreaseButton).toHaveStyle({
      minWidth: '24px',
      minHeight: '22px',
      padding: '3px 4px',
    });

    fireEvent.pointerDown(atkIncreaseButton, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(atkIncreaseButton, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.click(atkIncreaseButton);

    expect(onModifyCounter).toHaveBeenCalledWith('card-1', 'atk', 1);
    expect(onInspect).not.toHaveBeenCalled();
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

  it('scales fine-input hover quick actions down in overview density', () => {
    renderWithInputProfile(
      'fine',
      <Card
        card={createCard({ isEvolveCard: true })}
        onModifyCounter={vi.fn()}
        onModifyGenericCounter={vi.fn()}
        onSendToBottom={vi.fn()}
        onBanish={vi.fn()}
        onReturnEvolve={vi.fn()}
        onCemetery={vi.fn()}
        onTap={vi.fn()}
      />,
      'overview'
    );

    expect(screen.getByTestId('card-controls')).toHaveStyle({
      padding: '3px',
      gap: '1px',
    });
    expect(screen.getByText('Bot')).toHaveStyle({
      fontSize: '9px',
      minWidth: '28px',
      padding: '1px 3px',
    });
    expect(screen.getByText('+A')).toHaveStyle({
      minWidth: '20px',
      minHeight: '17px',
      padding: '1px 2px',
      fontSize: '9px',
    });
    expect(screen.getByText('+C')).toHaveStyle({
      width: '18px',
      minHeight: '15px',
      padding: '0px 2px',
      fontSize: '8px',
    });
    expect(screen.getByText('REST')).toHaveStyle({
      minHeight: '18px',
      minWidth: '30px',
      fontSize: '8px',
      display: 'flex',
    });
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

  it('does not render atk/hp counter controls in cemetery or banish zones', () => {
    const onModifyCounter = vi.fn();
    const { rerender } = render(
      <Card
        card={createCard({ zone: 'cemetery-host' })}
        onModifyCounter={onModifyCounter}
      />
    );

    expect(screen.queryByText('+A')).not.toBeInTheDocument();
    expect(screen.queryByText('-A')).not.toBeInTheDocument();
    expect(screen.queryByText('+H')).not.toBeInTheDocument();
    expect(screen.queryByText('-H')).not.toBeInTheDocument();

    rerender(
      <Card
        card={createCard({ zone: 'banish-host' })}
        onModifyCounter={onModifyCounter}
      />
    );

    expect(screen.queryByText('+A')).not.toBeInTheDocument();
    expect(screen.queryByText('-A')).not.toBeInTheDocument();
    expect(screen.queryByText('+H')).not.toBeInTheDocument();
    expect(screen.queryByText('-H')).not.toBeInTheDocument();
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

  it('does not inspect a completed drag even when the pointer returns to its starting point', () => {
    const onInspect = vi.fn();
    dndState.isDragging = true;
    try {
      render(<Card card={createCard()} onInspect={onInspect} />);
      const element = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
      fireEvent.pointerDown(element, { clientX: 10, clientY: 20, button: 0 });
      fireEvent.pointerUp(element, { clientX: 10, clientY: 20, button: 0 });
      expect(onInspect).not.toHaveBeenCalled();
    } finally {
      dndState.isDragging = false;
    }
  });

  it('does not turn a cancelled drag into a tap when the pointer is released', () => {
    const onInspect = vi.fn();
    const onCardTapAction = vi.fn();
    const ui = () => <Card card={createCard()} onInspect={onInspect} onCardTapAction={onCardTapAction} />;
    const { rerender } = render(ui());
    const element = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(element, { clientX: 10, clientY: 20, button: 0 });
    try {
      dndState.isDragging = true;
      rerender(ui());
      dndState.isDragging = false;
      rerender(ui());
      fireEvent.pointerUp(element, { clientX: 10, clientY: 20, button: 0 });
      expect(onCardTapAction).not.toHaveBeenCalled();
      expect(onInspect).not.toHaveBeenCalled();
      // Cancellation must not disable the next intentional tap.
      fireEvent.pointerDown(element, { clientX: 10, clientY: 20, button: 0 });
      fireEvent.pointerUp(element, { clientX: 10, clientY: 20, button: 0 });
      expect(onInspect).toHaveBeenCalledTimes(1);
    } finally {
      dndState.isDragging = false;
    }
  });

  it('cancels a pending tap on Escape without blocking the next tap', () => {
    const onInspect = vi.fn();
    render(<Card card={createCard()} onInspect={onInspect} />);
    const element = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(element, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.keyDown(element, { key: 'Escape' });
    fireEvent.pointerUp(element, { clientX: 10, clientY: 20, button: 0 });
    expect(onInspect).not.toHaveBeenCalled();
    fireEvent.pointerDown(element, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(element, { clientX: 10, clientY: 20, button: 0 });
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
        card={createCard({ zone: 'ex-host', counters: { atk: 0, hp: 0 }, baseCardType: null, cardKindNormalized: 'token_equipment', isTokenCard: true })}
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

  it('counter-rotates current stats badge when card is tapped so stats remain upright', () => {
    render(
      <Card
        card={createCard({ isTapped: true, counters: { atk: 1, hp: 0 } })}
        baseStats={{ atk: 3, hp: 4 }}
      />
    );

    const badge = screen.getByTestId('current-stats-badge');
    expect(badge).toHaveStyle({ transform: 'rotate(-90deg)' });
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

  it('hides quick actions when requested while keeping click inspect available', () => {
    const onInspect = vi.fn();
    render(
      <Card
        card={createCard()}
        onCemetery={vi.fn()}
        onInspect={onInspect}
        quickActionsDisabled={true}
      />
    );

    expect(screen.queryByTestId('card-controls')).not.toBeInTheDocument();

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ id: 'card-1' }), expect.any(Object));
  });

  it('keeps quick actions hidden by default for coarse input until card tap', () => {
    const onSendToBottom = vi.fn();

    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
        onSendToBottom={onSendToBottom}
      />
    );

    expect(screen.queryByTestId('card-coarse-action-sheet')).not.toBeInTheDocument();

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(screen.getByTestId('card-coarse-action-sheet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send to bottom of deck' }));
    expect(onSendToBottom).toHaveBeenCalledWith('card-1');
  });

  it('does not open quick actions for coarse input when drag threshold is exceeded', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
        onSendToBottom={vi.fn()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 24, clientY: 20, button: 0 });

    expect(screen.queryByTestId('card-coarse-action-sheet')).not.toBeInTheDocument();
  });

  it('renders larger coarse action-sheet buttons for touch usability', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
        onSendToBottom={vi.fn()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(screen.getByRole('button', { name: 'Send to bottom of deck' })).toHaveStyle({ minHeight: '34px' });
  });

  it('keeps coarse action sheet scrollable within viewport height', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard({ isEvolveCard: true })}
        onSendToBottom={vi.fn()}
        onCemetery={vi.fn()}
        onBanish={vi.fn()}
        onReturnEvolve={vi.fn()}
        onTap={vi.fn()}
        onAttack={vi.fn()}
        onModifyCounter={vi.fn()}
        onModifyGenericCounter={vi.fn()}
        onInspect={vi.fn()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(screen.getByTestId('card-coarse-action-sheet')).toHaveStyle({
      position: 'fixed',
      overflowY: 'auto',
    });
  });

  it('does not open inspector when coarse action sheet is toggled', () => {
    const onInspect = vi.fn();

    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
        onSendToBottom={vi.fn()}
        onInspect={onInspect}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(screen.getByTestId('card-coarse-action-sheet')).toBeInTheDocument();
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('opens inspector from coarse action sheet details button', () => {
    const onInspect = vi.fn();

    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
        onSendToBottom={vi.fn()}
        onInspect={onInspect}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    const detailsButton = screen.getByRole('button', { name: 'View card details' });
    fireEvent.click(detailsButton);

    expect(onInspect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'card-1' }),
      expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
        right: expect.any(Number),
        bottom: expect.any(Number),
      })
    );
    expect(screen.queryByTestId('card-coarse-action-sheet')).not.toBeInTheDocument();
  });

  it('renders coarse action sheet outside rotated card container', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard({ isTapped: true })}
        onSendToBottom={vi.fn()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    const actionSheet = screen.getByTestId('card-coarse-action-sheet');
    expect(cardElement.contains(actionSheet)).toBe(false);
    expect(actionSheet.parentElement).toBe(document.body);
  });

  it('uses high-contrast text colors for coarse action-sheet buttons', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard({ isEvolveCard: true, isTapped: false })}
        onReturnEvolve={vi.fn()}
        onTap={vi.fn()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });

    expect(screen.getByRole('button', { name: 'Return to evolve deck' })).toHaveStyle({ color: 'rgb(255, 255, 255)' });
    expect(screen.getByRole('button', { name: 'REST' })).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('fires non-drag movement and attach actions from coarse action sheet', () => {
    const onSendToTop = vi.fn();
    const onSendToHand = vi.fn();
    const onSendToEx = vi.fn();
    const onStartAttach = vi.fn();

    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard({ zone: 'field-host' })}
        onSendToTop={onSendToTop}
        onSendToHand={onSendToHand}
        onSendToEx={onSendToEx}
        onStartAttach={onStartAttach}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    const tapCard = () => {
      fireEvent.pointerDown(cardElement, { clientX: 10, clientY: 20, button: 0 });
      fireEvent.pointerUp(cardElement, { clientX: 10, clientY: 20, button: 0 });
    };

    tapCard();
    fireEvent.click(screen.getByRole('button', { name: 'Send to top of deck' }));
    expect(onSendToTop).toHaveBeenCalledWith('card-1');

    tapCard();
    fireEvent.click(screen.getByRole('button', { name: 'Return to hand' }));
    expect(onSendToHand).toHaveBeenCalledWith('card-1');

    tapCard();
    fireEvent.click(screen.getByRole('button', { name: 'Move to EX area' }));
    expect(onSendToEx).toHaveBeenCalledWith('card-1');

    tapCard();
    fireEvent.click(screen.getByRole('button', { name: 'Stack / Link onto card' }));
    expect(onStartAttach).toHaveBeenCalledWith('card-1');
  });

  it('disables browser touch gestures on coarse input to keep dragging smooth', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    expect(cardElement).toHaveStyle({ touchAction: 'none' });
  });

  it('uses compact card dimensions for coarse input', () => {
    renderWithInputProfile(
      'coarse',
      <Card
        card={createCard()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    expect(cardElement).toHaveStyle({ width: '76px', height: '106px' });
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

  it('uses compact segmented combat buttons when rest and attack are both shown', () => {
    render(
      <Card
        card={createCard({ zone: 'field-host', isTapped: false })}
        baseStats={{ atk: 3, hp: 4 }}
        onTap={vi.fn()}
        onAttack={vi.fn()}
      />
    );

    expect(screen.getByText('REST')).toHaveStyle({
      minHeight: '22px',
      padding: '2px 5px',
      fontSize: '10px',
      lineHeight: '1',
      borderRadius: '3px',
    });
    expect(screen.getByText('Attack')).toHaveStyle({
      minHeight: '22px',
      padding: '2px 5px',
      fontSize: '10px',
      lineHeight: '1',
      borderRadius: '3px',
    });
  });

  it('raises hovered fine-input quick actions above neighboring cards', () => {
    render(
      <Card
        card={createCard({ zone: 'field-host', isTapped: true })}
        baseStats={{ atk: 3, hp: 4 }}
        onTap={vi.fn()}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;
    expect(cardElement).toHaveStyle({ zIndex: '1' });

    fireEvent.pointerEnter(cardElement);
    expect(cardElement).toHaveStyle({ zIndex: '140' });

    fireEvent.pointerLeave(cardElement);
    expect(cardElement).toHaveStyle({ zIndex: '1' });
  });

  it('notifies the parent zone when fine-input quick actions are hovered', () => {
    const onQuickActionsHoverChange = vi.fn();
    render(
      <Card
        card={createCard({ zone: 'field-host', isTapped: true })}
        baseStats={{ atk: 3, hp: 4 }}
        onTap={vi.fn()}
        onQuickActionsHoverChange={onQuickActionsHoverChange}
      />
    );

    const cardElement = screen.getByAltText('Test Card').closest('.game-card') as HTMLElement;

    fireEvent.pointerEnter(cardElement);
    expect(onQuickActionsHoverChange).toHaveBeenCalledWith('card-1', true);

    fireEvent.pointerLeave(cardElement);
    expect(onQuickActionsHoverChange).toHaveBeenCalledWith('card-1', false);
  });

});

describe('board selection interaction', () => {
  it('selects instead of inspecting or resting and shows related selection', () => {
    const select = vi.fn(() => true);
    const inspect = vi.fn();
    const tap = vi.fn();
    const { container } = render(<GameBoardMultiSelectionContext.Provider value={{ active: true, select, tone: () => 'related', selectAll: vi.fn(), canSelectZone: () => true }}>
      <Card card={createCard()} onInspect={inspect} onTap={tap} />
    </GameBoardMultiSelectionContext.Provider>);
    const element = container.querySelector('[data-card-id]')!;
    fireEvent.pointerDown(element, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(element, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.contextMenu(element);
    expect(select).toHaveBeenCalledOnce();
    expect(inspect).not.toHaveBeenCalled();
    expect(tap).not.toHaveBeenCalled();
    expect(element).toHaveAttribute('data-selection-tone', 'related');
    expect(screen.queryByRole('button', { name: /Rest/ })).not.toBeInTheDocument();
  });
  it('passes the modifier shortcut to selection without interfering with normal taps', () => {
    const select = vi.fn(() => true);
    const { container } = render(<GameBoardMultiSelectionContext.Provider value={{ active: false, select, tone: () => undefined, selectAll: vi.fn(), canSelectZone: () => true }}>
      <Card card={createCard()} />
    </GameBoardMultiSelectionContext.Provider>);
    const element = container.querySelector('[data-card-id]')!;
    fireEvent.pointerDown(element, { button: 0, clientX: 10, clientY: 10, ctrlKey: true });
    fireEvent.pointerUp(element, { button: 0, clientX: 10, clientY: 10, ctrlKey: true });
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: createCard().id }), true);
  });
});

it('selects a card with the keyboard while selection mode is active', () => {
  const select = vi.fn(() => true);
  const { container } = render(<GameBoardMultiSelectionContext.Provider value={{ active: true, select, tone: () => undefined, selectAll: vi.fn(), canSelectZone: () => true }}>
    <Card card={createCard()} />
  </GameBoardMultiSelectionContext.Provider>);
  fireEvent.keyDown(container.querySelector('[data-card-id]')!, { key: 'Enter' });
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: createCard().id }), false);
});


describe('multi-selection regressions', () => {
  it.each(['ctrlKey', 'metaKey'])('preserves inspection and click propagation when %s selection is rejected', modifier => {
    const onInspect = vi.fn();
    const onClick = vi.fn();
    const select = vi.fn(() => false);
    const { container } = render(<div onClick={onClick}><GameBoardMultiSelectionContext.Provider value={{ active: false, select, tone: () => undefined, selectAll: vi.fn(), canSelectZone: () => true }}>
      <Card card={createCard()} onInspect={onInspect} />
    </GameBoardMultiSelectionContext.Provider></div>);
    const element = container.querySelector('[data-card-id]')!;
    const pointer = { button: 0, clientX: 10, clientY: 10, [modifier]: true };
    fireEvent.pointerDown(element, pointer);
    fireEvent.pointerUp(element, pointer);
    fireEvent.click(element, { [modifier]: true });
    expect(select).toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('preserves right-click rest when a Ctrl shortcut is rejected', () => {
    const onTap = vi.fn();
    const { container } = render(<GameBoardMultiSelectionContext.Provider value={{ active: false, select: () => false, tone: () => undefined, selectAll: vi.fn(), canSelectZone: () => true }}>
      <Card card={createCard()} onTap={onTap} />
    </GameBoardMultiSelectionContext.Provider>);
    const element = container.querySelector('[data-card-id]')!;
    fireEvent.pointerDown(element, { button: 0, ctrlKey: true });
    fireEvent.contextMenu(element, { ctrlKey: true });
    expect(onTap).toHaveBeenCalledWith('card-1');
  });

  it('consumes an accepted shortcut exactly once without inspecting, clicking or resting', () => {
    const select = vi.fn(() => true);
    const onInspect = vi.fn();
    const onClick = vi.fn();
    const onTap = vi.fn();
    const { container } = render(<div onClick={onClick}><GameBoardMultiSelectionContext.Provider value={{ active: false, select, tone: () => undefined, selectAll: vi.fn(), canSelectZone: () => true }}>
      <Card card={createCard()} onInspect={onInspect} onTap={onTap} />
    </GameBoardMultiSelectionContext.Provider></div>);
    const element = container.querySelector('[data-card-id]')!;
    fireEvent.pointerDown(element, { button: 0, ctrlKey: true });
    fireEvent.pointerUp(element, { button: 0, ctrlKey: true });
    fireEvent.click(element, { ctrlKey: true });
    fireEvent.contextMenu(element, { ctrlKey: true });
    expect(select).toHaveBeenCalledOnce();
    expect(onInspect).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
    // A later keyboard click without a modifier must not inherit this shortcut.
    fireEvent.click(element);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('clears card and parent hover immediately when selection hides quick actions', () => {
    const onQuickActionsHoverChange = vi.fn();
    const context = { active: false, select: vi.fn(() => true), tone: () => undefined, selectAll: vi.fn(), canSelectZone: () => true };
    const ui = (active: boolean) => <GameBoardMultiSelectionContext.Provider value={{ ...context, active }}>
      <Card card={createCard()} onQuickActionsHoverChange={onQuickActionsHoverChange} />
    </GameBoardMultiSelectionContext.Provider>;
    const { container, rerender } = render(ui(false));
    const element = container.querySelector('[data-card-id]')!;
    fireEvent.pointerEnter(element);
    expect(element).toHaveStyle({ zIndex: '140' });
    expect(onQuickActionsHoverChange).toHaveBeenLastCalledWith('card-1', true);
    rerender(ui(true));
    expect(element).toHaveStyle({ zIndex: '1' });
    expect(onQuickActionsHoverChange).toHaveBeenLastCalledWith('card-1', false);
    fireEvent.pointerLeave(element);
    rerender(ui(false));
    expect(element).toHaveStyle({ zIndex: '1' });
    fireEvent.pointerEnter(element);
    expect(onQuickActionsHoverChange).toHaveBeenLastCalledWith('card-1', true);
    fireEvent.pointerLeave(element);
    expect(onQuickActionsHoverChange).toHaveBeenLastCalledWith('card-1', false);
  });
});
