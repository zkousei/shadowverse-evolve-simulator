import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardSavedDeckPickerDialog from './GameBoardSavedDeckPickerDialog';
import type { SavedDeckRecordV1 } from '../../utils/deck/deckStorage';

const deck: SavedDeckRecordV1 = { schemaVersion: 1, id: 'saved', name: 'Saved deck', createdAt: '', updatedAt: '',
  ruleConfig: { format: 'other', identityType: 'class', selectedClass: null, selectedTitle: null, selectedClasses: [null, null] },
  sections: { main: [], evolve: [], leader: [], token: [] } };
const props = () => ({ targetLabel: 'Player 1', savedDeckSearch: '',
  filteredSavedDeckOptions: [{ deck, summary: 'Other', counts: 'Main 1' }],
  onBackdropClick: vi.fn(), onClose: vi.fn(), onSearchChange: vi.fn(), onLoadDeck: vi.fn() });

describe('saved deck loading presentation', () => {
  it('disables duplicate loads while keeping close available', () => {
    const callbacks = props();
    render(<GameBoardSavedDeckPickerDialog {...callbacks} isLoading={true} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved deck');
    expect(screen.getByRole('button', { name: /^Load$/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onLoadDeck).not.toHaveBeenCalled();
  });
  it('offers another explicit load after failure without starting automatically', () => {
    const callbacks = props();
    render(<GameBoardSavedDeckPickerDialog {...callbacks} loadFailed={true} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the saved deck');
    expect(callbacks.onLoadDeck).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Load$/ }));
    expect(callbacks.onLoadDeck).toHaveBeenCalledWith(callbacks.filteredSavedDeckOptions[0]);
  });
});
