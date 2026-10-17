import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CardArtwork from './CardArtwork';

let dummyArtEnabled = true;

vi.mock('../utils/card/cardArtMode', () => ({
  isDummyCardArtEnabled: () => dummyArtEnabled,
}));

describe('CardArtwork', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    dummyArtEnabled = true;
  });

  it('retries an opted-in image after a transient failure without navigating away', () => {
    dummyArtEnabled = false;
    vi.useFakeTimers();
    render(<CardArtwork image="/transient.png" alt="Retry Card" retryOnError />);
    fireEvent.error(screen.getByAltText('Retry Card'));
    expect(screen.queryByAltText('Retry Card')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(999));
    expect(screen.queryByAltText('Retry Card')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    const image = screen.getByAltText('Retry Card');
    expect(image).toHaveAttribute('src', '/transient.png');
    fireEvent.load(image);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByAltText('Retry Card')).toBe(image);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops after two delayed retries for an unavailable image', () => {
    dummyArtEnabled = false;
    vi.useFakeTimers();
    render(<CardArtwork image="/missing.png" alt="Missing Card" retryOnError />);
    for (const delay of [1000, 3000]) {
      fireEvent.error(screen.getByAltText('Missing Card'));
      act(() => vi.advanceTimersByTime(delay));
      expect(screen.getByAltText('Missing Card')).toHaveAttribute('src', '/missing.png');
    }
    fireEvent.error(screen.getByAltText('Missing Card'));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByAltText('Missing Card')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Missing Card')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resets retry attempts on URL changes and cancels work for the previous image', () => {
    dummyArtEnabled = false;
    vi.useFakeTimers();
    const { rerender } = render(<CardArtwork image="/first.png" alt="Preview" retryOnError />);
    fireEvent.error(screen.getByAltText('Preview'));
    act(() => vi.advanceTimersByTime(500));
    rerender(<CardArtwork image="/second.png" alt="Preview" retryOnError />);
    fireEvent.error(screen.getByAltText('Preview'));
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', '/second.png');
    rerender(<CardArtwork image="/first.png" alt="Preview" retryOnError />);
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', '/first.png');
  });

  it('cancels a scheduled retry when unmounted', () => {
    dummyArtEnabled = false;
    vi.useFakeTimers();
    const { unmount } = render(<CardArtwork image="/retry.png" alt="Preview" retryOnError />);
    fireEvent.error(screen.getByAltText('Preview'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps retrying opt-in and forwards image loading hints', () => {
    dummyArtEnabled = false;
    vi.useFakeTimers();
    render(<CardArtwork image="/ordinary.png" alt="Ordinary" loading="lazy" decoding="async" />);
    const image = screen.getByAltText('Ordinary');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    fireEvent.error(image);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByAltText('Ordinary')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels retries when switching to the card back or dummy artwork', () => {
    dummyArtEnabled = false;
    vi.useFakeTimers();
    const { rerender } = render(<CardArtwork image="/retry.png" alt="Preview" retryOnError />);
    fireEvent.error(screen.getByAltText('Preview'));
    rerender(<CardArtwork image="/retry.png" alt="Preview" retryOnError isBack />);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByAltText('Card Back')).toHaveAttribute('src', '/card_back.png');
    rerender(<CardArtwork image="/new.png" alt="Preview" retryOnError />);
    fireEvent.error(screen.getByAltText('Preview'));
    dummyArtEnabled = true;
    rerender(<CardArtwork image="/new.png" alt="Preview" retryOnError />);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
  });

  it('shows a placeholder after an image error and loads a changed image', () => {
    dummyArtEnabled = false;
    const { rerender } = render(<CardArtwork image="/failed.png" alt="Preview" />);
    fireEvent.error(screen.getByAltText('Preview'));
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Preview')).toBeInTheDocument();
    rerender(<CardArtwork image="/replacement.png" alt="Preview" />);
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', '/replacement.png');
    dummyArtEnabled = true;
  });

  it('falls back to detail image in official mode when card image is empty', () => {
    dummyArtEnabled = false;

    render(
      <CardArtwork
        image=""
        alt="Fallback Image Card"
        detail={{
          name: 'Fallback Image Card',
          image: '/detail-image.png',
          cost: '1',
          atk: 1,
          hp: 1,
          type: 'フォロワー',
        }}
      />
    );

    expect(screen.getByAltText('Fallback Image Card')).toHaveAttribute('src', '/detail-image.png');
    dummyArtEnabled = true;
  });

  it('renders dummy artwork in official mode when no image is available', () => {
    dummyArtEnabled = false;

    render(
      <CardArtwork
        image=""
        alt="Preview Without Image"
        detail={{
          name: 'Preview Without Image',
          image: '',
          cost: '2',
          atk: 2,
          hp: 3,
          type: 'フォロワー',
          cardKindNormalized: 'follower',
        }}
      />
    );

    expect(screen.getByLabelText('Preview Without Image')).toBeInTheDocument();
    expect(screen.getByText('Preview Without Image')).toBeInTheDocument();
    expect(screen.queryByAltText('Preview Without Image')).not.toBeInTheDocument();
    dummyArtEnabled = true;
  });

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
        baseCardType={null}
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

  it('shows crest tokens as TOKEN without equipment styling', () => {
    render(
      <CardArtwork
        image="/test.png"
        alt="Crest Token"
        isTokenCard={true}
        detail={{
          name: 'Crest Token',
          cost: '-',
          atk: null,
          hp: null,
          type: 'クレスト・トークン',
          cardKindNormalized: 'token_crest',
        }}
      />
    );

    expect(screen.getAllByText('TOKEN')).toHaveLength(2);
    expect(screen.queryByText('EQUIPMENT')).not.toBeInTheDocument();
  });

  it('renders the dummy card back when requested', () => {
    render(
      <CardArtwork
        image="/ignored.png"
        alt="Hidden Card"
        isBack={true}
      />
    );

    expect(screen.getByLabelText('Card Back')).toBeInTheDocument();
    expect(screen.getByText('Shadowverse Evolve')).toBeInTheDocument();
    expect(screen.getByText('Card Back')).toBeInTheDocument();
  });

  it('renders leader fallback styling and placeholder stats when details are sparse', () => {
    render(
      <CardArtwork
        image="/leader.png"
        alt="Leader Card"
        isLeaderCard={true}
        detail={{
          name: 'Leader Card',
          cost: '-',
          atk: null,
          hp: null,
          type: 'Leader',
        }}
      />
    );

    expect(screen.getByText('LEADER')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });
});
