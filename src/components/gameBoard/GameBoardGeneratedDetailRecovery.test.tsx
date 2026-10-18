import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardCardInspector from './GameBoardCardInspector';

const props = () => ({
  selectedInspectorCard: { id: 'instance', cardId: 'CUSTOM', name: 'Custom', image: '/custom.png', zone: 'field-host', owner: 'host' as const, isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
  inspectorPresentation: { primaryMeta: '', secondaryMeta: '', stats: null }, inspectorPopoverStyle: {},
  onClose: vi.fn(), onRetryDetails: vi.fn(), onRefreshCatalog: vi.fn(),
});
const detail = { id: 'CUSTOM', name: 'Custom', image: '/custom.png', className: '', title: '', type: '', subtype: '', cost: '1', atk: null, hp: null, abilityText: 'Verified ability' };

describe('generated card detail recovery in the inspector', () => {
  it('shows per-card loading even when the catalog index is ready', () => {
    render(<GameBoardCardInspector {...props()} catalogStatus="ready" detailStatus="loading" />);
    expect(screen.getByText('Loading card information…')).toBeInTheDocument();
    expect(screen.queryByText('No detailed ability text found for this card.')).not.toBeInTheDocument();
  });

  it('distinguishes unknown/custom IDs from failed loading and keeps the supplied artwork', () => {
    const callbacks = props();
    render(<GameBoardCardInspector {...callbacks} detailStatus="unknown" />);
    expect(screen.getByText('This card is not in the current card catalog.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Custom' })).toHaveAttribute('src', '/custom.png');
    expect(screen.queryByRole('button', { name: 'Retry card information' })).not.toBeInTheDocument();
    expect(callbacks.onRefreshCatalog).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh card catalog' }));
    expect(callbacks.onRefreshCatalog).toHaveBeenCalledTimes(1);
  });

  it('offers separate explicit detail retry and catalog refresh after failure, keeping Close available', () => {
    const callbacks = props();
    render(<GameBoardCardInspector {...callbacks} detailStatus="error" />);
    expect(screen.getByText('Could not load card information. You can retry without reloading the game.')).toBeInTheDocument();
    expect(callbacks.onRetryDetails).not.toHaveBeenCalled();
    expect(callbacks.onRefreshCatalog).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry card information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh card catalog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(callbacks.onRetryDetails).toHaveBeenCalledTimes(1);
    expect(callbacks.onRefreshCatalog).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an initial catalog failure rather than loading when no detail source has opened yet', () => {
    render(<GameBoardCardInspector {...props()} catalogStatus="error" detailStatus="idle" />);
    expect(screen.getByText('Could not load card information. You can retry without reloading the game.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry card information' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh card catalog' })).toBeEnabled();
  });

  it('disables duplicate recovery actions during refresh without disabling Close', () => {
    const callbacks = props();
    render(<GameBoardCardInspector {...callbacks} detailStatus="error" isRefreshingCatalog={true} />);
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing card catalog');
    expect(screen.getByRole('button', { name: 'Retry card information' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh card catalog' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed refresh explicit and allows manual retry', () => {
    render(<GameBoardCardInspector {...props()} detailStatus="error" catalogRefreshFailed={true} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh the card catalog.');
    expect(screen.getByRole('button', { name: 'Refresh card catalog' })).toBeEnabled();
  });

  it.each(['Verified ability', ''])('keeps cached complete details readable during another failure, including an empty ability', abilityText => {
    render(<GameBoardCardInspector {...props()} detailStatus="ready" catalogStatus="error" catalogRefreshFailed={true} selectedInspectorDetail={{ ...detail, abilityText }} />);
    expect(screen.getByText(abilityText || 'No detailed ability text found for this card.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh card catalog' })).not.toBeInTheDocument();
  });
});
