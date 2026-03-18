import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DeckBuilder from './DeckBuilder';

const mockCards = [
  {
    id: 'BP01-001',
    name: 'Alpha Knight',
    image: '/alpha.png',
    cost: '1',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー',
    rarity: 'LG',
    product_name: 'Booster Pack 1',
    card_kind_normalized: 'follower',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'EV01-001',
    name: 'Evolve Angel',
    image: '/evolve.png',
    cost: '-',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'フォロワー・エボルヴ',
    rarity: 'PR',
    product_name: 'Extra Product',
    card_kind_normalized: 'evolve_follower',
    deck_section: 'evolve',
    is_token: false,
    is_evolve_card: true,
    is_deck_build_legal: true,
  },
  {
    id: 'BP02-007',
    name: 'Beta Mage',
    image: '/beta.png',
    cost: '7',
    class: 'ウィッチ',
    title: 'Mage Tale',
    type: 'スペル',
    rarity: 'GR',
    product_name: 'Booster Pack 2',
    card_kind_normalized: 'spell',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'LDR01-001',
    name: 'Leader Luna',
    image: '/leader.png',
    cost: '-',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'リーダー',
    rarity: 'PR',
    product_name: 'Leader Set',
    card_kind_normalized: 'leader',
    deck_section: 'leader',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'TK01-001',
    name: 'Knight Token',
    image: '/token.png',
    cost: '-',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'アミュレット・トークン',
    rarity: 'PR',
    product_name: 'Token Set',
    card_kind_normalized: 'token_amulet',
    deck_section: 'token',
    is_token: true,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
];

let importedDeckPayload: {
  rule?: 'constructed' | 'crossover' | 'other';
  identityType?: 'class' | 'title';
  selectedClass?: string | null;
  selectedTitle?: string | null;
  mainDeck?: typeof mockCards;
  evolveDeck?: typeof mockCards;
  leaderCard?: (typeof mockCards)[number];
  tokenDeck?: typeof mockCards;
} = {
  mainDeck: [mockCards[0]],
  evolveDeck: [mockCards[1]],
  leaderCard: mockCards[3],
  tokenDeck: [mockCards[4]],
};

describe('DeckBuilder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    importedDeckPayload = {
      mainDeck: [mockCards[0]],
      evolveDeck: [mockCards[1]],
      leaderCard: mockCards[3],
      tokenDeck: [mockCards[4]],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockCards),
      } as unknown as Response)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads cards, filters them, and updates deck counts through add/remove actions', async () => {
    render(<DeckBuilder />);
    const classFilterGroup = screen.getByRole('group', { name: 'Class filter' });
    const costFilterGroup = screen.getByRole('group', { name: 'Cost filter' });
    const deckSectionFilterGroup = screen.getByRole('group', { name: 'Deck section filter' });
    const expansionFilter = screen.getByRole('combobox', { name: 'Expansion filter' });
    const rarityFilter = screen.getByRole('combobox', { name: 'Rarity filter' });
    const productFilter = screen.getByRole('combobox', { name: 'Product filter' });
    const constructedClass = screen.getByRole('combobox', { name: 'Constructed class' });

    expect(screen.getByText('Loading card database...')).toBeInTheDocument();
    expect(await screen.findByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();
    expect(screen.getByText('Select a class or title to enable constructed deck building.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search cards by name...'), {
      target: { value: 'beta' },
    });
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search cards by name...'), {
      target: { value: '' },
    });
    fireEvent.click(within(costFilterGroup).getByRole('button', { name: '7+' }));
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.click(within(classFilterGroup).getByRole('button', { name: 'ウィッチ' }));
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();
    expect(screen.queryByText('Evolve Angel')).not.toBeInTheDocument();
    expect(within(classFilterGroup).getByRole('button', { name: 'ウィッチ' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(classFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(within(costFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.change(rarityFilter, {
      target: { value: 'PR' },
    });
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.change(rarityFilter, {
      target: { value: 'All' },
    });
    fireEvent.change(productFilter, {
      target: { value: 'Booster Pack 1' },
    });
    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();

    fireEvent.change(productFilter, {
      target: { value: 'All' },
    });
    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'Leader' }));
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();
    expect(within(deckSectionFilterGroup).getByRole('button', { name: 'Leader' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.change(expansionFilter, {
      target: { value: 'EV01' },
    });
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

	    fireEvent.change(expansionFilter, {
	      target: { value: 'All' },
	    });
	    const alphaCard = screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement;
	    const evolveCard = screen.getByAltText('Evolve Angel').closest('.glass-panel') as HTMLElement;
	    const leaderCard = screen.getByAltText('Leader Luna').closest('.glass-panel') as HTMLElement;
	    const tokenCard = screen.getByAltText('Knight Token').closest('.glass-panel') as HTMLElement;

	    expect(within(alphaCard).queryByTitle('Add to Evolve Deck')).not.toBeInTheDocument();
	    expect(within(evolveCard).queryByTitle('Add to Main Deck')).not.toBeInTheDocument();
      expect(within(alphaCard).getByTitle('Add to Main Deck')).toBeDisabled();

      fireEvent.change(constructedClass, {
        target: { value: 'ロイヤル' },
      });

	    fireEvent.click(within(alphaCard).getByTitle('Add to Main Deck'));
	    fireEvent.click(within(evolveCard).getByTitle('Add to Evolve Deck'));
	    fireEvent.click(within(leaderCard).getByTitle('Set as Leader'));
	    fireEvent.click(within(tokenCard).getByTitle('Add to Token Deck'));

	    expect(screen.getByText('1/50')).toBeInTheDocument();
	    expect(screen.getByText('1/10')).toBeInTheDocument();
	    expect(screen.getByText('1/1')).toBeInTheDocument();
	    expect(screen.getAllByText('Leader Luna')).toHaveLength(2);
	    expect(screen.getAllByText('Knight Token')).toHaveLength(2);

	    const leaderSection = screen.getByRole('heading', { name: /^Leader/ }).nextElementSibling as HTMLElement;
	    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
	    const evolveDeckSection = screen.getByRole('heading', { name: /^Evolve Deck/ }).nextElementSibling as HTMLElement;
	    const tokenDeckSection = screen.getByRole('heading', { name: /^Token Deck/ }).nextElementSibling as HTMLElement;
	    expect(within(leaderSection).getByText('Leader Luna')).toBeInTheDocument();
	    expect(within(mainDeckSection).getByText('Alpha Knight')).toBeInTheDocument();
	    expect(within(evolveDeckSection).getByText('Evolve Angel')).toBeInTheDocument();
	    expect(within(tokenDeckSection).getByText('Knight Token')).toBeInTheDocument();

	    fireEvent.click(within(leaderSection).getByRole('button'));
	    fireEvent.click(within(mainDeckSection).getByRole('button'));
	    fireEvent.click(within(evolveDeckSection).getByRole('button'));
	    fireEvent.click(within(tokenDeckSection).getByRole('button'));

	    expect(screen.getByText('0/50')).toBeInTheDocument();
	    expect(screen.getByText('0/10')).toBeInTheDocument();
	    expect(screen.getByText('0/1')).toBeInTheDocument();
	  });

  it('excludes cards without a selectable class when a class filter is active', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    const classFilterGroup = screen.getByRole('group', { name: 'Class filter' });
    fireEvent.click(within(classFilterGroup).getByRole('button', { name: 'ロイヤル' }));

    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();
    expect(within(classFilterGroup).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('combines rarity and product filters with other filters', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Rarity filter' }), {
      target: { value: 'GR' },
    });
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Product filter' }), {
      target: { value: 'Booster Pack 2' },
    });
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Product filter' }), {
      target: { value: 'Booster Pack 1' },
    });
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();
  });

  it('filters cards by deck section and combines with other filters', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    const deckSectionFilterGroup = screen.getByRole('group', { name: 'Deck section filter' });
    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'Token' }));
    expect(screen.getByText('Knight Token')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();
    expect(screen.queryByText('Leader Luna')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Rarity filter' }), {
      target: { value: 'PR' },
    });
    expect(screen.getByText('Knight Token')).toBeInTheDocument();

    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'Leader' }));
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.queryByText('Knight Token')).not.toBeInTheDocument();
  });

  it('filters the library by constructed title rules when a title identity is selected', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed title' }), {
      target: { value: 'Hero Tale' },
    });

    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Evolve Angel')).toBeInTheDocument();
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.getByText('Knight Token')).toBeInTheDocument();
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();
  });

  it('hides same-name variants only after applying the active filters', async () => {
    const duplicateAlpha = {
      ...mockCards[0],
      id: 'PR-001',
      image: '/alpha-variant.png',
      rarity: 'PR',
      product_name: 'Promo Pack',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([...mockCards, duplicateAlpha]),
      } as unknown as Response)
    );

    render(<DeckBuilder />);

    expect((await screen.findAllByAltText('Alpha Knight')).length).toBe(2);

    fireEvent.click(screen.getByLabelText('Hide same-name variants'));

    await waitFor(() => {
      expect(screen.getAllByAltText('Alpha Knight')).toHaveLength(1);
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Product filter' }), {
      target: { value: 'Promo Pack' },
    });

    expect(screen.getAllByAltText('Alpha Knight')).toHaveLength(1);
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();
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
      fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
        target: { value: 'ロイヤル' },
      });
	    fireEvent.click(within(screen.getByAltText('Leader Luna').closest('.glass-panel') as HTMLElement).getByTitle('Set as Leader'));
	    fireEvent.click(within(screen.getByAltText('Knight Token').closest('.glass-panel') as HTMLElement).getByTitle('Add to Token Deck'));
	    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

	    expect(createObjectURL).toHaveBeenCalled();
	    expect(clickSpy).toHaveBeenCalled();

	    const appendedAnchor = document.body.querySelector('a[download="My_Deck.json"]') as HTMLAnchorElement | null;
	    expect(appendedAnchor).not.toBeNull();
	    expect(appendedAnchor?.href).toBe('blob:deck');
	    const exportedBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
	    const exportedDeck = JSON.parse(await exportedBlob.text());
      expect(exportedDeck.rule).toBe('constructed');
      expect(exportedDeck.identityType).toBe('class');
      expect(exportedDeck.selectedClass).toBe('ロイヤル');
	    expect(exportedDeck.leaderCard?.id).toBe('LDR01-001');
	    expect(exportedDeck.tokenDeck).toEqual([expect.objectContaining({ id: 'TK01-001' })]);

	    vi.runAllTimers();
	    expect(revokeObjectURL).toHaveBeenCalledWith('blob:deck');
  });

  it('imports a deck from JSON and falls back to the file name when needed', async () => {
    importedDeckPayload = {
      rule: 'constructed',
      identityType: 'class',
      selectedClass: 'ロイヤル',
      selectedTitle: null,
      mainDeck: [mockCards[0]],
      evolveDeck: [mockCards[1]],
      leaderCard: mockCards[3],
      tokenDeck: [mockCards[4]],
    };

    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText() {
        const result = JSON.stringify(importedDeckPayload);
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
	      expect(screen.getByText('1/1')).toBeInTheDocument();
	      expect(screen.getAllByText('Leader Luna')).toHaveLength(2);
	      expect(screen.getAllByText('Knight Token')).toHaveLength(2);
	    });
      expect(screen.getByRole('combobox', { name: 'Constructed class' })).toHaveValue('ロイヤル');
	  });

  it('sanitizes imported cards that are placed in the wrong deck section', async () => {
    importedDeckPayload = {
      mainDeck: [mockCards[1]],
      evolveDeck: [mockCards[0]],
    };

    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText() {
        const result = JSON.stringify(importedDeckPayload);
        this.onload?.({ target: { result } } as ProgressEvent<FileReader>);
      }
    }

    vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);

    const { container } = render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'Invalid Placement Deck.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

	    await waitFor(() => {
	      expect(screen.getByDisplayValue('Invalid Placement Deck')).toBeInTheDocument();
	      expect(screen.getByText('0/50')).toBeInTheDocument();
	      expect(screen.getByText('0/10')).toBeInTheDocument();
	      expect(screen.getByText('0/1')).toBeInTheDocument();
	    });
	  });
});
