import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DeckBuilder from './DeckBuilder';

const mockCards = [
  { id: 'BP01-001', name: 'Alpha Knight', image: '/alpha.png', cost: '1' },
  { id: 'EV01-001', name: 'Evolve Angel', image: '/evolve.png', cost: '-' },
  { id: 'BP02-007', name: 'Beta Mage', image: '/beta.png', cost: '7' },
];

describe('DeckBuilder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockCards),
      } as Response)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads cards, filters them, and updates deck counts through add/remove actions', async () => {
    render(<DeckBuilder />);

    expect(screen.getByText('Loading card database...')).toBeInTheDocument();
    expect(await screen.findByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search cards by name...'), {
      target: { value: 'beta' },
    });
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search cards by name...'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: '7+' }));
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'EV01' },
    });
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'All' },
    });
    fireEvent.click(screen.getAllByTitle('Add to Main Deck')[0]);
    fireEvent.click(screen.getAllByTitle('Add to Evolve Deck')[1]);

    expect(screen.getByText('1/50')).toBeInTheDocument();
    expect(screen.getByText('1/10')).toBeInTheDocument();

    const mainDeckSection = screen.getByText('Main Deck').closest('h3')?.parentElement;
    const evolveDeckSection = screen.getByText('Evolve Deck').closest('h3')?.parentElement;
    expect(within(mainDeckSection as HTMLElement).getByText('Alpha Knight')).toBeInTheDocument();
    expect(within(evolveDeckSection as HTMLElement).getByText('Evolve Angel')).toBeInTheDocument();

    fireEvent.click(within(mainDeckSection as HTMLElement).getAllByRole('button')[0]);
    fireEvent.click(within(evolveDeckSection as HTMLElement).getAllByRole('button')[0]);

    expect(screen.getByText('0/50')).toBeInTheDocument();
    expect(screen.getByText('0/10')).toBeInTheDocument();
  });

  it('exports a sanitized deck file', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:deck');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');
    vi.useFakeTimers();

    const deckNameInput = screen.getByPlaceholderText('Deck Name');
    fireEvent.change(deckNameInput, { target: { value: 'My/Deck' } });
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    const appendedAnchor = document.body.querySelector('a[download="My_Deck.json"]') as HTMLAnchorElement | null;
    expect(appendedAnchor).not.toBeNull();
    expect(appendedAnchor?.href).toBe('blob:deck');

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:deck');
  });

  it('imports a deck from JSON and falls back to the file name when needed', async () => {
    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText() {
        const result = JSON.stringify({
          mainDeck: [mockCards[0]],
          evolveDeck: [mockCards[1]],
        });
        this.onload?.({ target: { result } } as ProgressEvent<FileReader>);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);

    const { container } = render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'Imported Deck.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Imported Deck')).toBeInTheDocument();
      expect(screen.getByText('1/50')).toBeInTheDocument();
      expect(screen.getByText('1/10')).toBeInTheDocument();
    });
  });
});
