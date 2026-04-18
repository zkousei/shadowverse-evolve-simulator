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

const getRenderedCardOrder = (): string[] => {
  const cardGrid = screen.getByTestId('search-card-grid');
  return Array.from(cardGrid.querySelectorAll('img[alt]')).map((image) => image.getAttribute('alt') ?? '');
};

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

  it('shows card type counts only when searching the cemetery or main deck', () => {
    const cards = [
      createCard({ id: 'follower-1', zone: 'cemetery-host', baseCardType: 'follower' }),
      createCard({ id: 'follower-2', zone: 'cemetery-host', baseCardType: 'follower' }),
      createCard({ id: 'spell-1', zone: 'cemetery-host', baseCardType: 'spell' }),
      createCard({ id: 'amulet-1', zone: 'cemetery-host', baseCardType: 'amulet' }),
    ];
    const { rerender } = render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={cards}
        onExtractCard={vi.fn()}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.getByRole('heading', { name: 'Cemetery (4)' })).toBeInTheDocument();
    expect(screen.getByTestId('search-card-type-counts')).toHaveTextContent('Follower: 2 / Spell: 1 / Amulet: 1');

    rerender(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={cards}
        onExtractCard={vi.fn()}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.getByTestId('search-card-type-counts')).toHaveTextContent('Follower: 2 / Spell: 1 / Amulet: 1');

    rerender(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Evolve Deck"
        zoneId="evolveDeck-host"
        cards={cards}
        onExtractCard={vi.fn()}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.queryByTestId('search-card-type-counts')).not.toBeInTheDocument();
  });

  it('shows sort controls only for cemetery and banish searches', () => {
    const { rerender } = render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[createCard({ zone: 'cemetery-host' })]}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    expect(screen.getByRole('combobox', { name: 'Sort cards' })).toBeInTheDocument();

    rerender(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Banish"
        zoneId="banish-host"
        cards={[createCard({ zone: 'banish-host' })]}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    expect(screen.getByRole('combobox', { name: 'Sort cards' })).toBeInTheDocument();

    rerender(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ zone: 'mainDeck-host' })]}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    expect(screen.queryByRole('combobox', { name: 'Sort cards' })).not.toBeInTheDocument();
  });

  it('sorts cemetery cards by added order, cost, and card type for display only', () => {
    const cards = [
      createCard({ id: 'card-1', cardId: 'BP01-003', name: 'Amulet 3', zone: 'cemetery-host', baseCardType: 'amulet' }),
      createCard({ id: 'card-2', cardId: 'BP01-001', name: 'Spell 1', zone: 'cemetery-host', baseCardType: 'spell' }),
      createCard({ id: 'card-3', cardId: 'BP01-002', name: 'Follower 2', zone: 'cemetery-host', baseCardType: 'follower' }),
    ];

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={cards}
        cardDetailLookup={{
          'BP01-001': { id: 'BP01-001', name: 'Spell 1', image: '/spell.png', className: '', title: '', type: 'スペル', subtype: '', cost: '1', atk: null, hp: null, abilityText: '' },
          'BP01-002': { id: 'BP01-002', name: 'Follower 2', image: '/follower.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '2', atk: 2, hp: 2, abilityText: '' },
          'BP01-003': { id: 'BP01-003', name: 'Amulet 3', image: '/amulet.png', className: '', title: '', type: 'アミュレット', subtype: '', cost: '3', atk: null, hp: null, abilityText: '' },
        }}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    expect(getRenderedCardOrder()).toEqual(['Amulet 3', 'Spell 1', 'Follower 2']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort cards' }), { target: { value: 'cost' } });
    expect(getRenderedCardOrder()).toEqual(['Spell 1', 'Follower 2', 'Amulet 3']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort cards' }), { target: { value: 'type' } });
    expect(getRenderedCardOrder()).toEqual(['Follower 2', 'Spell 1', 'Amulet 3']);
  });

  it('groups same-name cards when sorting by cost', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', cardId: 'BP01-001', name: 'Alpha', zone: 'cemetery-host', baseCardType: 'spell' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Beta', zone: 'cemetery-host', baseCardType: 'follower' }),
          createCard({ id: 'card-3', cardId: 'BP01-003', name: 'Alpha', zone: 'cemetery-host', baseCardType: 'amulet' }),
          createCard({ id: 'card-4', cardId: 'BP01-004', name: 'Beta', zone: 'cemetery-host', baseCardType: 'spell' }),
        ]}
        cardDetailLookup={{
          'BP01-001': { id: 'BP01-001', name: 'Alpha', image: '/alpha1.png', className: '', title: '', type: 'スペル', subtype: '', cost: '2', atk: null, hp: null, abilityText: '' },
          'BP01-002': { id: 'BP01-002', name: 'Beta', image: '/beta1.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '2', atk: 2, hp: 2, abilityText: '' },
          'BP01-003': { id: 'BP01-003', name: 'Alpha', image: '/alpha2.png', className: '', title: '', type: 'アミュレット', subtype: '', cost: '2', atk: null, hp: null, abilityText: '' },
          'BP01-004': { id: 'BP01-004', name: 'Beta', image: '/beta2.png', className: '', title: '', type: 'スペル', subtype: '', cost: '2', atk: null, hp: null, abilityText: '' },
        }}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort cards' }), { target: { value: 'cost' } });
    expect(getRenderedCardOrder()).toEqual(['Alpha', 'Alpha', 'Beta', 'Beta']);
  });

  it('groups same-name cards when sorting by card type', () => {
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', cardId: 'BP01-001', name: 'Sword', zone: 'cemetery-host', baseCardType: 'follower' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Arrow', zone: 'cemetery-host', baseCardType: 'follower' }),
          createCard({ id: 'card-3', cardId: 'BP01-003', name: 'Sword', zone: 'cemetery-host', baseCardType: 'follower' }),
          createCard({ id: 'card-4', cardId: 'BP01-004', name: 'Arrow', zone: 'cemetery-host', baseCardType: 'follower' }),
        ]}
        cardDetailLookup={{
          'BP01-001': { id: 'BP01-001', name: 'Sword', image: '/sword1.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '4', atk: 4, hp: 4, abilityText: '' },
          'BP01-002': { id: 'BP01-002', name: 'Arrow', image: '/arrow1.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '1', atk: 1, hp: 1, abilityText: '' },
          'BP01-003': { id: 'BP01-003', name: 'Sword', image: '/sword2.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '2', atk: 2, hp: 2, abilityText: '' },
          'BP01-004': { id: 'BP01-004', name: 'Arrow', image: '/arrow2.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '3', atk: 3, hp: 3, abilityText: '' },
        }}
        onExtractCard={vi.fn()}
        viewerRole="host"
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort cards' }), { target: { value: 'type' } });
    expect(getRenderedCardOrder()).toEqual(['Arrow', 'Arrow', 'Sword', 'Sword']);
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
        onSendToCemetery={vi.fn()}
        onSendCardsToCemetery={vi.fn()}
        viewerRole="host"
        allowHandExtraction={false}
      />
    );

    expect(screen.getByText('Set Face-Down to Field')).toBeInTheDocument();
    expect(screen.queryByText('Add to Hand')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to EX Area')).not.toBeInTheDocument();
    expect(screen.queryByText('Play to Field')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send to cemetery' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('Test Card'));

    expect(screen.queryByRole('button', { name: 'Send to cemetery' })).not.toBeInTheDocument();
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

  it('requests a shuffle confirmation after main-deck card operations', () => {
    const onExtractCard = vi.fn();
    const onSendToCemetery = vi.fn();
    const onRequestMainDeckShuffleConfirm = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ isEvolveCard: false, zone: 'mainDeck-host' })]}
        onExtractCard={onExtractCard}
        onSendToCemetery={onSendToCemetery}
        onRequestMainDeckShuffleConfirm={onRequestMainDeckShuffleConfirm}
        targetRole="host"
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Add to Hand'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to cemetery' }));

    expect(onExtractCard).toHaveBeenCalledWith('card-1', 'hand-host');
    expect(onSendToCemetery).toHaveBeenCalledWith('card-1');
    expect(onRequestMainDeckShuffleConfirm).toHaveBeenNthCalledWith(1, 'host');
    expect(onRequestMainDeckShuffleConfirm).toHaveBeenNthCalledWith(2, 'host');
  });

  it('does not request a shuffle confirmation for non-main-deck operations', () => {
    const onRequestMainDeckShuffleConfirm = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[createCard({ zone: 'cemetery-host' })]}
        onExtractCard={vi.fn()}
        onSendToBottom={vi.fn()}
        onRequestMainDeckShuffleConfirm={onRequestMainDeckShuffleConfirm}
        targetRole="host"
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add to Hand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send to bottom of deck' }));

    expect(onRequestMainDeckShuffleConfirm).not.toHaveBeenCalled();
  });

  it('shows send-to-bottom for cemetery and banish searches only, and fires the callback', () => {
    const onSendToBottom = vi.fn();
    const { rerender } = render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[createCard({ zone: 'cemetery-host' })]}
        onExtractCard={vi.fn()}
        onSendToBottom={onSendToBottom}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Send to bottom of deck'));
    expect(onSendToBottom).toHaveBeenCalledWith('card-1');

    rerender(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Banish"
        zoneId="banish-host"
        cards={[createCard({ zone: 'banish-host' })]}
        onExtractCard={vi.fn()}
        onSendToBottom={onSendToBottom}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.getByText('Send to bottom of deck')).toBeInTheDocument();

    rerender(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ zone: 'mainDeck-host' })]}
        onExtractCard={vi.fn()}
        onSendToBottom={onSendToBottom}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    expect(screen.queryByText('Send to bottom of deck')).not.toBeInTheDocument();
  });

  it('enables bulk send-to-bottom when only the batch callback is provided', () => {
    const onSendCardsToBottom = vi.fn();
    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', zone: 'cemetery-host' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Card 2', zone: 'cemetery-host' }),
        ]}
        onExtractCard={vi.fn()}
        onSendCardsToBottom={onSendCardsToBottom}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Multiple' }));
    fireEvent.click(screen.getByAltText('Test Card'));
    fireEvent.click(screen.getByAltText('Card 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to bottom of deck' }));

    expect(onSendCardsToBottom).toHaveBeenCalledWith(['card-1', 'card-2']);
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

  it('supports bulk selecting cards and extracting them to hand from supported zones', () => {
    const onExtractCards = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[
          createCard({ id: 'card-1', name: 'First Card', zone: 'mainDeck-host' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Second Card', zone: 'mainDeck-host' }),
        ]}
        onExtractCard={vi.fn()}
        onExtractCards={onExtractCards}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('First Card'));
    fireEvent.click(screen.getByAltText('Second Card'));

    expect(screen.getAllByText('2 selected')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Hand' }));

    expect(onExtractCards).toHaveBeenCalledWith(['card-1', 'card-2'], 'hand-host', false);
  });

  it('supports bulk sending selected cemetery cards to the bottom of the deck', () => {
    const onSendCardsToBottom = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', name: 'First Card', zone: 'cemetery-host' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Second Card', zone: 'cemetery-host' }),
        ]}
        onExtractCard={vi.fn()}
        onSendToBottom={vi.fn()}
        onSendCardsToBottom={onSendCardsToBottom}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('First Card'));
    fireEvent.click(screen.getByAltText('Second Card'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to bottom of deck' }));

    expect(onSendCardsToBottom).toHaveBeenCalledWith(['card-1', 'card-2']);
  });

  it('keeps bulk selection and batch actions working after changing sort mode', () => {
    const onSendCardsToBottom = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', cardId: 'BP01-003', name: 'Amulet 3', zone: 'cemetery-host', baseCardType: 'amulet' }),
          createCard({ id: 'card-2', cardId: 'BP01-001', name: 'Spell 1', zone: 'cemetery-host', baseCardType: 'spell' }),
          createCard({ id: 'card-3', cardId: 'BP01-002', name: 'Follower 2', zone: 'cemetery-host', baseCardType: 'follower' }),
        ]}
        cardDetailLookup={{
          'BP01-001': { id: 'BP01-001', name: 'Spell 1', image: '/spell.png', className: '', title: '', type: 'スペル', subtype: '', cost: '1', atk: null, hp: null, abilityText: '' },
          'BP01-002': { id: 'BP01-002', name: 'Follower 2', image: '/follower.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '2', atk: 2, hp: 2, abilityText: '' },
          'BP01-003': { id: 'BP01-003', name: 'Amulet 3', image: '/amulet.png', className: '', title: '', type: 'アミュレット', subtype: '', cost: '3', atk: null, hp: null, abilityText: '' },
        }}
        onExtractCard={vi.fn()}
        onSendCardsToBottom={onSendCardsToBottom}
        viewerRole="host"
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort cards' }), { target: { value: 'cost' } });
    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('Spell 1'));
    fireEvent.click(screen.getByAltText('Follower 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to bottom of deck' }));

    expect(onSendCardsToBottom).toHaveBeenCalledWith(['card-2', 'card-3']);
  });

  it('keeps selected cards and batch actions working when sort mode changes during bulk selection', () => {
    const onSendCardsToBottom = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', cardId: 'BP01-003', name: 'Amulet 3', zone: 'cemetery-host', baseCardType: 'amulet' }),
          createCard({ id: 'card-2', cardId: 'BP01-001', name: 'Spell 1', zone: 'cemetery-host', baseCardType: 'spell' }),
          createCard({ id: 'card-3', cardId: 'BP01-002', name: 'Follower 2', zone: 'cemetery-host', baseCardType: 'follower' }),
        ]}
        cardDetailLookup={{
          'BP01-001': { id: 'BP01-001', name: 'Spell 1', image: '/spell.png', className: '', title: '', type: 'スペル', subtype: '', cost: '1', atk: null, hp: null, abilityText: '' },
          'BP01-002': { id: 'BP01-002', name: 'Follower 2', image: '/follower.png', className: '', title: '', type: 'フォロワー', subtype: '', cost: '2', atk: 2, hp: 2, abilityText: '' },
          'BP01-003': { id: 'BP01-003', name: 'Amulet 3', image: '/amulet.png', className: '', title: '', type: 'アミュレット', subtype: '', cost: '3', atk: null, hp: null, abilityText: '' },
        }}
        onExtractCard={vi.fn()}
        onSendCardsToBottom={onSendCardsToBottom}
        viewerRole="host"
      />
    );

    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('Amulet 3'));
    fireEvent.click(screen.getByAltText('Follower 2'));

    expect(screen.getAllByText('2 selected')).toHaveLength(2);

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort cards' }), { target: { value: 'cost' } });
    expect(screen.getAllByText('2 selected')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Send to bottom of deck' }));
    expect(onSendCardsToBottom).toHaveBeenCalledWith(['card-1', 'card-3']);
  });

  it('sends a main-deck card to cemetery immediately', () => {
    const onSendToCemetery = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[createCard({ zone: 'mainDeck-host' })]}
        onExtractCard={vi.fn()}
        onSendToCemetery={onSendToCemetery}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send to cemetery' }));

    expect(onSendToCemetery).toHaveBeenCalledWith('card-1');
  });

  it('supports bulk sending selected main-deck cards to cemetery', () => {
    const onSendCardsToCemetery = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Main Deck"
        zoneId="mainDeck-host"
        cards={[
          createCard({ id: 'card-1', name: 'First Card', zone: 'mainDeck-host' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Second Card', zone: 'mainDeck-host' }),
        ]}
        onExtractCard={vi.fn()}
        onSendCardsToCemetery={onSendCardsToCemetery}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('First Card'));
    fireEvent.click(screen.getByAltText('Second Card'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to cemetery' }));

    expect(onSendCardsToCemetery).toHaveBeenCalledWith(['card-1', 'card-2']);
  });

  it('banishes a cemetery card immediately', () => {
    const onBanish = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[createCard({ zone: 'cemetery-host' })]}
        onExtractCard={vi.fn()}
        onBanish={onBanish}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Banish this card' }));

    expect(onBanish).toHaveBeenCalledWith('card-1');
  });

  it('supports bulk banishing selected cemetery cards', () => {
    const onBanishCards = vi.fn();

    render(
      <CardSearchModal
        isOpen={true}
        onClose={vi.fn()}
        title="Cemetery"
        zoneId="cemetery-host"
        cards={[
          createCard({ id: 'card-1', name: 'First Card', zone: 'cemetery-host' }),
          createCard({ id: 'card-2', cardId: 'BP01-002', name: 'Second Card', zone: 'cemetery-host' }),
        ]}
        onExtractCard={vi.fn()}
        onBanishCards={onBanishCards}
        viewerRole="host"
        allowHandExtraction={true}
      />
    );

    fireEvent.click(screen.getByText('Select Multiple'));
    fireEvent.click(screen.getByAltText('First Card'));
    fireEvent.click(screen.getByAltText('Second Card'));
    fireEvent.click(screen.getByRole('button', { name: 'Banish this card' }));

    expect(onBanishCards).toHaveBeenCalledWith(['card-1', 'card-2']);
  });
});
