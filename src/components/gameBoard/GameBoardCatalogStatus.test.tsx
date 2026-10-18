import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardCatalogStatus from './GameBoardCatalogStatus';
import GameBoardCardInspector from './GameBoardCardInspector';

const inspectorProps = {
  selectedInspectorCard: { id: 'instance', cardId: 'TEST-1', name: 'Custom', image: '', zone: 'field-host', owner: 'host' as const, isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 } },
  inspectorPresentation: { primaryMeta: '', secondaryMeta: '', stats: null },
  inspectorPopoverStyle: {}, onClose: vi.fn(),
};

describe('catalog recovery presentation', () => {
  it('offers an explicit retry after failure', () => {
    const retry = vi.fn();
    render(<GameBoardCatalogStatus status="error" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load card information');
    fireEvent.click(screen.getByRole('button', { name: 'Retry card information' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each(['loading', 'ready'] as const)('does not offer retry while %s', status => {
    render(<GameBoardCatalogStatus status={status} onRetry={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['loading', 'Loading card information'],
    ['error', 'Could not load card information'],
  ] as const)('distinguishes missing details from %s', (status, message) => {
    render(<GameBoardCardInspector {...inspectorProps} catalogStatus={status} />);
    expect(screen.getByText(message, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('No detailed ability text found for this card.')).not.toBeInTheDocument();
  });

  it('keeps the existing unknown/custom card message after successful loading', () => {
    render(<GameBoardCardInspector {...inspectorProps} catalogStatus="ready" />);
    expect(screen.getByText('No detailed ability text found for this card.')).toBeInTheDocument();
  });

  it('keeps complete known details visible even when another request fails', () => {
    render(<GameBoardCardInspector {...inspectorProps} catalogStatus="error" selectedInspectorDetail={{
      id: 'TEST-1', name: 'Full card', image: '', className: '', title: '', type: '', subtype: '', cost: '1', atk: null, hp: null, abilityText: 'Verified ability',
    }} />);
    expect(screen.getByText('Verified ability')).toBeInTheDocument();
    expect(screen.queryByText('Could not load card information', { exact: false })).not.toBeInTheDocument();
  });
});
