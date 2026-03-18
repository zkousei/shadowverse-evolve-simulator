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
    subtype: '兵士',
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
    subtype: '天使',
    rarity: 'UR',
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
    subtype: '魔法使い・学院',
    rarity: 'GR',
    product_name: 'Booster Pack 2',
    card_kind_normalized: 'spell',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'BP03-001',
    name: 'Gamma Dragon',
    image: '/gamma.png',
    cost: '4',
    class: 'ドラゴン',
    title: 'Dragon Tale',
    type: 'フォロワー',
    subtype: '竜族',
    rarity: 'BR',
    product_name: 'Booster Pack 3',
    card_kind_normalized: 'follower',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'LDR01-001',
    name: 'Leader Luna',
    image: '/leader-luna.png',
    cost: '-',
    class: 'ロイヤル',
    title: 'Hero Tale',
    type: 'リーダー',
    subtype: '指揮官',
    rarity: 'PR',
    product_name: 'Leader Set',
    card_kind_normalized: 'leader',
    deck_section: 'leader',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
  {
    id: 'LDR01-002',
    name: 'Leader Merlin',
    image: '/leader-merlin.png',
    cost: '-',
    class: 'ウィッチ',
    title: 'Mage Tale',
    type: 'リーダー',
    subtype: '魔法使い',
    rarity: 'SL',
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
    subtype: '兵士',
    rarity: 'PR',
    product_name: 'Token Set',
    card_kind_normalized: 'token_amulet',
    deck_section: 'token',
    is_token: true,
    is_evolve_card: false,
    is_deck_build_legal: true,
  },
];

let importedDeckPayload: Record<string, unknown> = {
  mainDeck: [mockCards[0]],
  evolveDeck: [mockCards[1]],
  leaderCards: [mockCards[4]],
  tokenDeck: [mockCards[6]],
};

const createUniqueCards = (
  template: (typeof mockCards)[number],
  count: number,
  overrides: Partial<(typeof mockCards)[number]> = {}
) => Array.from({ length: count }, (_, index) => ({
  ...template,
  ...overrides,
  id: `${template.id}-${index + 1}`,
  name: `${template.name} ${index + 1}`,
}));

const stubFileReaderWithImportedDeck = () => {
  class MockFileReader {
    onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

    readAsText() {
      const result = JSON.stringify(importedDeckPayload);
      this.onload?.({ target: { result } } as ProgressEvent<FileReader>);
    }
  }

  vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);
};

describe('DeckBuilder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    importedDeckPayload = {
      mainDeck: [mockCards[0]],
      evolveDeck: [mockCards[1]],
      leaderCards: [mockCards[4]],
      tokenDeck: [mockCards[6]],
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
    const cardTypeFilterGroup = screen.getByRole('group', { name: 'Card type filter' });
    const costFilterGroup = screen.getByRole('group', { name: 'Cost filter' });
    const deckSectionFilterGroup = screen.getByRole('group', { name: 'Deck section filter' });
    const expansionFilter = screen.getByRole('combobox', { name: 'Expansion filter' });
    const constructedClass = screen.getByRole('combobox', { name: 'Constructed class' });

    expect(screen.getByText('Loading card database...')).toBeInTheDocument();
    expect(await screen.findByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Select a class or title to enable constructed deck building.')).toBeInTheDocument();
    expect(screen.getByText('Resolve these issues before exporting.')).toBeInTheDocument();
    expect(within(constructedClass).queryByRole('option', { name: 'ニュートラル' })).not.toBeInTheDocument();

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
    expect(within(classFilterGroup).getByRole('button', { name: 'ウィッチ' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(classFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(within(cardTypeFilterGroup).getByRole('button', { name: 'Spell' }));
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();
    expect(screen.queryByText('Evolve Angel')).not.toBeInTheDocument();

    fireEvent.click(within(classFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(within(cardTypeFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(within(costFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'Leader' }));
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

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

    fireEvent.click(within(leaderSection).getByTitle('Remove one leader'));
    fireEvent.click(within(mainDeckSection).getByTitle('Remove one copy from Main Deck'));
    fireEvent.click(within(evolveDeckSection).getByTitle('Remove one copy from Evolve Deck'));
    fireEvent.click(within(tokenDeckSection).getByTitle('Remove one copy from Token Deck'));

    expect(screen.getByText('0/50')).toBeInTheDocument();
    expect(screen.getByText('0/10')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
  });

  it('filters cards by deck section and combines with rarity and product filters', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    const deckSectionFilterGroup = screen.getByRole('group', { name: 'Deck section filter' });
    const cardTypeFilterGroup = screen.getByRole('group', { name: 'Card type filter' });
    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'Token' }));
    expect(screen.getByText('Knight Token')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.click(within(cardTypeFilterGroup).getByRole('button', { name: 'Amulet' }));
    expect(screen.getByText('Knight Token')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Rarity filter' }), {
      target: { value: 'PR' },
    });
    expect(screen.getByText('Knight Token')).toBeInTheDocument();

    fireEvent.click(within(cardTypeFilterGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(within(deckSectionFilterGroup).getByRole('button', { name: 'Leader' }));
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.queryByText('Knight Token')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Product filter' }), {
      target: { value: 'Leader Set' },
    });
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.queryByText('Leader Merlin')).not.toBeInTheDocument();
  });

  it('opens a card preview modal from the card library and closes it', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.click(screen.getByRole('button', { name: 'Preview Alpha Knight' }));

    expect(screen.getByRole('dialog', { name: 'Alpha Knight preview' })).toBeInTheDocument();
    expect(screen.getByAltText('Alpha Knight enlarged')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Alpha Knight preview' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Alpha Knight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close card preview' }));
    expect(screen.queryByRole('dialog', { name: 'Alpha Knight preview' })).not.toBeInTheDocument();
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
    expect(screen.queryByText('Gamma Dragon')).not.toBeInTheDocument();
    expect(screen.queryByText('Leader Merlin')).not.toBeInTheDocument();
  });

  it('filters cards by selected subtype tags with OR matching', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    const subtypeInput = screen.getByLabelText('Subtype filter input');
    fireEvent.change(subtypeInput, { target: { value: '兵士' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Knight Token')).toBeInTheDocument();
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();

    fireEvent.change(subtypeInput, { target: { value: '学院' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
  });

  it('resets card library filters without changing the deck rule settings', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByPlaceholderText('Search cards by name...'), {
      target: { value: 'beta' },
    });
    fireEvent.click(within(screen.getByRole('group', { name: 'Deck section filter' })).getByRole('button', { name: 'Token' }));
    fireEvent.click(screen.getByLabelText('Hide same-name variants'));
    fireEvent.change(screen.getByLabelText('Subtype filter input'), {
      target: { value: '兵士' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
      target: { value: 'ロイヤル' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));

    expect(screen.getByPlaceholderText('Search cards by name...')).toHaveValue('');
    expect(within(screen.getByRole('group', { name: 'Deck section filter' })).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Hide same-name variants')).not.toBeChecked();
    expect(screen.queryByTitle('Remove subtype filter 兵士')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Constructed class' })).toHaveValue('ロイヤル');
    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.queryByText('Beta Mage')).not.toBeInTheDocument();
    expect(screen.getByText('Knight Token')).toBeInTheDocument();
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

  it('sorts my deck display by added order, cost, or card id', async () => {
    importedDeckPayload = {
      rule: 'other',
      mainDeck: [mockCards[2], mockCards[0], mockCards[3]],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    };
    stubFileReaderWithImportedDeck();

    const { container } = render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'Sorted Deck.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    const getMainDeckNames = () => within(mainDeckSection)
      .getAllByText(/Alpha Knight|Beta Mage|Gamma Dragon/)
      .map(node => node.textContent);

    await waitFor(() => {
      expect(getMainDeckNames()).toEqual(['Beta Mage', 'Alpha Knight', 'Gamma Dragon']);
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck sort' }), {
      target: { value: 'cost' },
    });
    expect(getMainDeckNames()).toEqual(['Alpha Knight', 'Gamma Dragon', 'Beta Mage']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck sort' }), {
      target: { value: 'id' },
    });
    expect(getMainDeckNames()).toEqual(['Alpha Knight', 'Beta Mage', 'Gamma Dragon']);
  });

  it('resets deck contents only after confirmation', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
      target: { value: 'ロイヤル' },
    });

    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(within(screen.getByAltText('Evolve Angel').closest('.glass-panel') as HTMLElement).getByTitle('Add to Evolve Deck'));
    fireEvent.click(within(screen.getByAltText('Leader Luna').closest('.glass-panel') as HTMLElement).getByTitle('Set as Leader'));
    fireEvent.click(within(screen.getByAltText('Knight Token').closest('.glass-panel') as HTMLElement).getByTitle('Add to Token Deck'));

    expect(screen.getByText('1/50')).toBeInTheDocument();
    expect(screen.getByText('1/10')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Deck' }));
    expect(screen.getByRole('dialog', { name: 'Reset deck confirmation' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Reset deck confirmation' })).not.toBeInTheDocument();
    expect(screen.getByText('1/50')).toBeInTheDocument();
    expect(screen.getByText('1/10')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Deck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    expect(screen.queryByRole('dialog', { name: 'Reset deck confirmation' })).not.toBeInTheDocument();
    expect(screen.getByText('0/50')).toBeInTheDocument();
    expect(screen.getByText('0/10')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Constructed class' })).toHaveValue('ロイヤル');
  });

  it('groups identical card ids in my deck and shows their count', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
      target: { value: 'ロイヤル' },
    });

    const alphaCard = screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement;
    const addMainButton = within(alphaCard).getByTitle('Add to Main Deck');

    fireEvent.click(addMainButton);
    fireEvent.click(addMainButton);
    fireEvent.click(addMainButton);

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;

    expect(within(mainDeckSection).getAllByText('Alpha Knight')).toHaveLength(1);
    expect(within(mainDeckSection).getByText('× 3')).toBeInTheDocument();

    fireEvent.click(within(mainDeckSection).getByTitle('Remove one copy from Main Deck'));

    expect(within(mainDeckSection).getByText('× 2')).toBeInTheDocument();
  });

  it('adds one more copy from grouped my deck controls when allowed', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
      target: { value: 'ロイヤル' },
    });

    const alphaCard = screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement;
    fireEvent.click(within(alphaCard).getByTitle('Add to Main Deck'));

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    fireEvent.click(within(mainDeckSection).getByTitle('Add one copy to Main Deck'));

    expect(within(mainDeckSection).getByText('× 2')).toBeInTheDocument();
  });

  it('keeps grouped row position stable in added order when removing the latest copy', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });

    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(within(screen.getByAltText('Beta Mage').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    const getGroupedNames = () => within(mainDeckSection)
      .getAllByText(/Alpha Knight|Beta Mage/)
      .map(node => node.textContent);
    const getAlphaRow = () => within(mainDeckSection).getByText('Alpha Knight').closest('div[style*="justify-content: space-between"]') as HTMLElement;

    expect(getGroupedNames()).toEqual(['Alpha Knight', 'Beta Mage']);
    expect(within(mainDeckSection).getByText('× 2')).toBeInTheDocument();

    fireEvent.click(within(getAlphaRow()).getByTitle('Remove one copy from Main Deck'));

    expect(getGroupedNames()).toEqual(['Alpha Knight', 'Beta Mage']);
  });

  it('supports crossover decks with two selected classes and two leaders', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'crossover' },
    });
    expect(screen.getByText('Select two different classes to enable crossover deck building.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Crossover class A' }), {
      target: { value: 'ロイヤル' },
    });
    expect(within(screen.getByRole('combobox', { name: 'Crossover class B' })).queryByRole('option', { name: 'ロイヤル' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Crossover class B' }), {
      target: { value: 'ウィッチ' },
    });
    expect(within(screen.getByRole('combobox', { name: 'Crossover class A' })).queryByRole('option', { name: 'ウィッチ' })).not.toBeInTheDocument();

    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.getByText('Leader Luna')).toBeInTheDocument();
    expect(screen.getByText('Leader Merlin')).toBeInTheDocument();
    expect(screen.getByText('Knight Token')).toBeInTheDocument();
    expect(screen.queryByText('Gamma Dragon')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByAltText('Leader Luna').closest('.glass-panel') as HTMLElement).getByTitle('Set as Leader'));
    fireEvent.click(within(screen.getByAltText('Leader Merlin').closest('.glass-panel') as HTMLElement).getByTitle('Set as Leader'));

    expect(screen.getByText('2/2')).toBeInTheDocument();
    const leaderSection = screen.getByRole('heading', { name: /^Leader/ }).nextElementSibling as HTMLElement;
    expect(within(leaderSection).getByText('Leader Luna')).toBeInTheDocument();
    expect(within(leaderSection).getByText('Leader Merlin')).toBeInTheDocument();
    expect(screen.getByText('Main Deck must contain at least 40 cards (0/40).')).toBeInTheDocument();
  });

  it('disables export and shows deck issues while the deck is illegal', async () => {
    render(<DeckBuilder />);

    await screen.findByText('Alpha Knight');

    const exportButton = screen.getByRole('button', { name: /Export/i });
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('Constructed decks require a selected class.')).toBeInTheDocument();
    expect(screen.getByText('Main Deck must contain at least 40 cards (0/40).')).toBeInTheDocument();
    expect(screen.getByText('This constructed deck requires exactly 1 leader (0/1).')).toBeInTheDocument();
  });

  it('disables adding a fourth effective copy of the same card', async () => {
    const duplicateAlpha = {
      ...mockCards[0],
      id: 'BP01-099',
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
    expect((await screen.findAllByText('Alpha Knight')).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
      target: { value: 'ロイヤル' },
    });

    const alphaCard = screen.getAllByAltText('Alpha Knight')[0].closest('.glass-panel') as HTMLElement;
    const addMainButton = within(alphaCard).getByTitle('Add to Main Deck');

    fireEvent.click(addMainButton);
    fireEvent.click(addMainButton);
    fireEvent.click(addMainButton);

    await waitFor(() => {
      expect(addMainButton).toBeDisabled();
    });
  });

  it('exports a legal crossover deck file with selected classes and leader cards', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:deck');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    importedDeckPayload = {
      deckName: 'Imported Legal Crossover',
      rule: 'crossover',
      selectedClasses: ['ロイヤル', 'ウィッチ'],
      mainDeck: [
        ...createUniqueCards(mockCards[0], 20),
        ...createUniqueCards(mockCards[2], 20),
      ],
      evolveDeck: [
        ...createUniqueCards(mockCards[1], 5),
        ...createUniqueCards({ ...mockCards[1], id: 'EV02-001', name: 'Royal Evolve 2' }, 5, {
          type: 'フォロワー・エボルヴ',
          class: 'ロイヤル',
          deck_section: 'evolve',
          card_kind_normalized: 'evolve_follower',
        }),
      ],
      leaderCards: [mockCards[4], mockCards[5]],
      tokenDeck: [mockCards[6]],
    };
    stubFileReaderWithImportedDeck();

    const { container } = render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'Legal Crossover.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Imported Legal Crossover')).toBeInTheDocument();
      expect(screen.getByText('This deck is legal and ready to export.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export/i })).toBeEnabled();
    });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    const exportedBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const exportedDeck = JSON.parse(await exportedBlob.text());
    expect(exportedDeck.rule).toBe('crossover');
    expect(exportedDeck.selectedClasses).toEqual(['ロイヤル', 'ウィッチ']);
    expect(exportedDeck.leaderCards).toEqual([
      expect.objectContaining({ id: 'LDR01-001' }),
      expect.objectContaining({ id: 'LDR01-002' }),
    ]);

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:deck');
  });

  it('imports a crossover deck from JSON and falls back to the file name when needed', async () => {
    importedDeckPayload = {
      rule: 'crossover',
      selectedClasses: ['ロイヤル', 'ウィッチ'],
      mainDeck: [mockCards[0]],
      evolveDeck: [mockCards[1]],
      leaderCards: [mockCards[4], mockCards[5]],
      tokenDeck: [mockCards[6]],
    };

    stubFileReaderWithImportedDeck();

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
      expect(screen.getByText('2/2')).toBeInTheDocument();
      expect(screen.getAllByText('Leader Luna')).toHaveLength(2);
      expect(screen.getAllByText('Leader Merlin')).toHaveLength(2);
    });

    expect(screen.getByRole('combobox', { name: 'Deck format' })).toHaveValue('crossover');
    expect(screen.getByRole('combobox', { name: 'Crossover class A' })).toHaveValue('ロイヤル');
    expect(screen.getByRole('combobox', { name: 'Crossover class B' })).toHaveValue('ウィッチ');
  });

  it('sanitizes imported cards that are placed in the wrong deck section', async () => {
    importedDeckPayload = {
      mainDeck: [mockCards[1]],
      evolveDeck: [mockCards[0]],
      leaderCards: [mockCards[0]],
      tokenDeck: [mockCards[0]],
    };

    stubFileReaderWithImportedDeck();

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
