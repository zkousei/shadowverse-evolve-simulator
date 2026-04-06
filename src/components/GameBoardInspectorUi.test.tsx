import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardCardInspector from './GameBoardCardInspector';
import GameBoardCardInspectorSection from './GameBoardCardInspectorSection';

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

describe('GameBoard extracted UI components - card inspector', () => {
  it('renders card inspector and wires close action', () => {
    const onClose = vi.fn();

    render(
      <GameBoardCardInspector
        selectedInspectorCard={{
          id: 'card-1',
          cardId: 'TEST-001',
          name: 'Alpha Knight',
          image: '/alpha.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
          baseCardType: 'follower',
          cardKindNormalized: 'follower',
        }}
        selectedInspectorDetail={{
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
          abilityText: '[Fanfare] Test ability.',
        }}
        inspectorPresentation={{
          primaryMeta: 'Royal / Hero Tale',
          secondaryMeta: 'Follower / Soldier',
          stats: '2 / 2',
        }}
        inspectorPopoverStyle={{ position: 'fixed', top: 40, left: 40 }}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('card-inspector')).toBeInTheDocument();
    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Royal / Hero Tale')).toBeInTheDocument();
    expect(screen.getByText('Follower / Soldier')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders card inspector section and returns null without selection', () => {
    const { rerender } = render(
      <GameBoardCardInspectorSection
        selectedInspectorCard={null}
        selectedInspectorDetail={null}
        inspectorPresentation={{
          primaryMeta: '',
          secondaryMeta: '',
          stats: '',
        }}
        inspectorPopoverStyle={null}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('card-inspector')).not.toBeInTheDocument();

    rerender(
      <GameBoardCardInspectorSection
        selectedInspectorCard={{
          id: 'card-1',
          cardId: 'TEST-001',
          name: 'Alpha Knight',
          image: '/alpha.png',
          zone: 'field-host',
          owner: 'host',
          isTapped: false,
          isFlipped: false,
          counters: { atk: 0, hp: 0 },
          genericCounter: 0,
          baseCardType: 'follower',
          cardKindNormalized: 'follower',
        }}
        selectedInspectorDetail={{
          id: 'TEST-001',
          name: 'Alpha Knight',
          image: '/alpha.png',
          className: 'Royal',
          title: 'Hero Tale',
          type: 'Follower',
          subtype: 'Soldier',
          cost: '2',
          atk: 2,
          hp: 2,
          abilityText: '',
        }}
        inspectorPresentation={{
          primaryMeta: 'Royal / Hero Tale',
          secondaryMeta: 'Follower / Soldier',
          stats: '2 / 2',
        }}
        inspectorPopoverStyle={{ position: 'fixed', top: 20, left: 20 }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('card-inspector')).toBeInTheDocument();
  });
});
