import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardArtwork from './CardArtwork';

vi.mock('../utils/cardArtMode', () => ({
  isDummyCardArtEnabled: () => true,
}));

describe('CardArtwork', () => {
  it('shows an ADVANCE badge for advance cards instead of EVOLVE', () => {
    render(
      <CardArtwork
        image="/test.png"
        alt="Advance Card"
        isEvolveCard={true}
        detail={{
          name: 'Advance Card',
          cost: '4',
          atk: 3,
          hp: 4,
          type: 'フォロワー',
          cardKindNormalized: 'advance_follower',
        }}
      />
    );

    expect(screen.getByText('ADVANCE')).toBeInTheDocument();
    expect(screen.queryByText('EVOLVE')).not.toBeInTheDocument();
  });

  it('shows both TOKEN and the base card type for token cards', () => {
    render(
      <CardArtwork
        image="/test.png"
        alt="Token Follower"
        isTokenCard={true}
        baseCardType="follower"
        detail={{
          name: 'Token Follower',
          cost: '1',
          atk: 1,
          hp: 1,
          type: 'フォロワー',
          cardKindNormalized: 'token_follower',
        }}
      />
    );

    expect(screen.getByText('TOKEN')).toBeInTheDocument();
    expect(screen.getByText('FOLLOWER')).toBeInTheDocument();
  });

  it('shows EQUIPMENT as the base category for equipment cards', () => {
    render(
      <CardArtwork
        image="/test.png"
        alt="Equipment Card"
        detail={{
          name: 'Equipment Card',
          cost: '2',
          atk: null,
          hp: null,
          type: 'アミュレット',
          cardKindNormalized: 'equipment',
        }}
      />
    );

    expect(screen.getByText('EQUIPMENT')).toBeInTheDocument();
  });

  it('shows TOKEN and EQUIPMENT for token equipment cards', () => {
    render(
      <CardArtwork
        image="/test.png"
        alt="Token Equipment"
        isTokenCard={true}
        baseCardType="amulet"
        detail={{
          name: 'Token Equipment',
          cost: '1',
          atk: null,
          hp: null,
          type: 'アミュレット',
          cardKindNormalized: 'token_equipment',
        }}
      />
    );

    expect(screen.getByText('TOKEN')).toBeInTheDocument();
    expect(screen.getByText('EQUIPMENT')).toBeInTheDocument();
  });
});
