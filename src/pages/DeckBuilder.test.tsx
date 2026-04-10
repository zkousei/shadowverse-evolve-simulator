import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import DeckBuilder from './DeckBuilder';
import {
  listSavedDecks,
  loadDraft,
  SAVED_DECKS_KEY,
  saveDeck,
  saveDraft,
  serializeDeckState,
  type SavedDeckRecordV1,
} from '../utils/deckStorage';
import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { DeckRuleConfig } from '../models/deckRule';
import enTranslations from '../i18n/en/translation.json';
import { loadCardCatalog } from '../utils/cardCatalog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const parts = key.split('.');
      let result: unknown = enTranslations;
      for (const p of parts) {
        if (result == null) return key;
        result = typeof result === 'object' ? (result as Record<string, unknown>)[p] : undefined;
      }
      if (typeof result !== 'string') return key;
      let finalStr = result;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          finalStr = finalStr.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
      }
      return finalStr;
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

vi.mock('../utils/cardCatalog', () => ({
  loadCardCatalog: vi.fn(),
}));

const mockLoadCardCatalog = vi.mocked(loadCardCatalog);

const mockCards: DeckBuilderCardData[] = [
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
    atk: '2',
    hp: '2',
    ability_text: '[ファンファーレ] テスト能力。',
    card_kind_normalized: 'follower',
    deck_section: 'main',
    is_token: false,
    is_evolve_card: false,
    is_deck_build_legal: true,
    related_cards: [
      {
        id: 'TK01-001',
        name: 'Knight Token',
      },
    ],
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

const otherRuleConfig: DeckRuleConfig = {
  format: 'other',
  identityType: 'class',
  selectedClass: null,
  selectedTitle: null,
  selectedClasses: [null, null],
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

const seedSavedDecks = (
  count: number,
  buildDeckState: (index: number) => {
    mainDeck: DeckBuilderCardData[];
    evolveDeck: DeckBuilderCardData[];
    leaderCards: DeckBuilderCardData[];
    tokenDeck: DeckBuilderCardData[];
  } = () => ({
    mainDeck: [],
    evolveDeck: [],
    leaderCards: [],
    tokenDeck: [],
  })
) => {
  const decks: SavedDeckRecordV1[] = Array.from({ length: count }, (_, index) => {
    const updatedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, count - index)).toISOString();

    return {
      schemaVersion: 1,
      id: `saved-deck-${index + 1}`,
      name: `Saved Deck ${index + 1}`,
      createdAt: updatedAt,
      updatedAt,
      ruleConfig: otherRuleConfig,
      sections: serializeDeckState(buildDeckState(index)),
    };
  });

  window.localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify({
    schemaVersion: 1,
    decks,
  }));

  return decks;
};

const flushDraftPersistence = async () => {
  await act(async () => {
    vi.advanceTimersByTime(450);
    await Promise.resolve();
  });
};

const flushDeckBuilderCatalogLoad = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderLoadedDeckBuilder = async (expectedCardName = 'Alpha Knight') => {
  const rendered = render(<DeckBuilder />);
  await flushDeckBuilderCatalogLoad();
  expect(screen.getByText(expectedCardName)).toBeInTheDocument();
  return rendered;
};

describe('DeckBuilder', () => {
  beforeAll(() => {
    vi.setConfig({ testTimeout: 20000 });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    importedDeckPayload = {
      mainDeck: [mockCards[0]],
      evolveDeck: [mockCards[1]],
      leaderCards: [mockCards[4]],
      tokenDeck: [mockCards[6]],
    };
    mockLoadCardCatalog.mockReset();
    mockLoadCardCatalog.mockResolvedValue(mockCards);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    vi.resetConfig();
  });

  it('loads cards, filters them, and updates deck counts through add/remove actions', async () => {
    await renderLoadedDeckBuilder();

    const classFilterGroup = screen.getByRole('group', { name: 'Class filter' });
    const cardTypeFilterGroup = screen.getByRole('group', { name: 'Card type filter' });
    const costFilterGroup = screen.getByRole('group', { name: 'Cost filter' });
    const deckSectionFilterGroup = screen.getByRole('group', { name: 'Deck section filter' });
    const expansionFilter = screen.getByRole('combobox', { name: 'Expansion filter' });
    const constructedClass = screen.getByRole('combobox', { name: 'Constructed class' });

    expect(screen.getByText('Select a class or title to enable constructed deck building.')).toBeInTheDocument();
    expect(screen.getByText('Resolve these issues before exporting.')).toBeInTheDocument();
    expect(within(constructedClass).queryByRole('option', { name: 'Neutral' })).not.toBeInTheDocument();

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

    fireEvent.click(within(classFilterGroup).getByRole('button', { name: 'Witch' }));
    expect(screen.getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Knight')).not.toBeInTheDocument();
    expect(within(classFilterGroup).getByRole('button', { name: 'Witch' })).toHaveAttribute('aria-pressed', 'true');

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
  }, 10000);

  it('auto-adds a related token when a card is added to the main deck', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Constructed class' }), {
      target: { value: 'ロイヤル' },
    });

    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));

    const tokenDeckSection = screen.getByRole('heading', { name: /^Token Deck/ }).nextElementSibling as HTMLElement;
    await waitFor(() => {
      expect(within(tokenDeckSection).getByText('Knight Token')).toBeInTheDocument();
    });
  });

  it('updates the deck sort control without affecting the reset flow', async () => {
    render(<DeckBuilder />);

    expect(await screen.findByText('Alpha Knight')).toBeInTheDocument();

    const deckSort = screen.getByRole('combobox', { name: 'Deck sort' }) as HTMLSelectElement;
    expect(deckSort.value).toBe('added');

    fireEvent.change(deckSort, { target: { value: 'id' } });
    expect(deckSort.value).toBe('id');

    fireEvent.change(deckSort, { target: { value: 'cost' } });
    expect(deckSort.value).toBe('cost');
  });

  it('updates deck rule controls across constructed and crossover modes', async () => {
    render(<DeckBuilder />);

    expect(await screen.findByText('Alpha Knight')).toBeInTheDocument();

    const formatSelect = screen.getByRole('combobox', { name: 'Deck format' }) as HTMLSelectElement;
    const constructedClass = screen.getByRole('combobox', { name: 'Constructed class' }) as HTMLSelectElement;

    expect(formatSelect.value).toBe('constructed');
    expect(constructedClass.value).toBe('');

    fireEvent.change(constructedClass, { target: { value: 'ロイヤル' } });
    expect(constructedClass.value).toBe('ロイヤル');

    fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    expect(screen.queryByRole('combobox', { name: 'Constructed class' })).not.toBeInTheDocument();

    const constructedTitle = screen.getByRole('combobox', { name: 'Constructed title' }) as HTMLSelectElement;
    fireEvent.change(constructedTitle, { target: { value: 'Dragon Tale' } });
    expect(constructedTitle.value).toBe('Dragon Tale');

    fireEvent.change(formatSelect, { target: { value: 'crossover' } });
    expect(screen.queryByRole('group', { name: 'Deck identity type' })).not.toBeInTheDocument();

    const crossoverClassA = screen.getByRole('combobox', { name: 'Crossover class A' }) as HTMLSelectElement;
    const crossoverClassB = screen.getByRole('combobox', { name: 'Crossover class B' }) as HTMLSelectElement;

    expect(crossoverClassA.value).toBe('ロイヤル');
    expect(crossoverClassB.value).toBe('');

    fireEvent.change(crossoverClassB, { target: { value: 'ウィッチ' } });
    expect(crossoverClassB.value).toBe('ウィッチ');

    fireEvent.change(formatSelect, { target: { value: 'constructed' } });
    expect(screen.getByRole('group', { name: 'Deck identity type' })).toBeInTheDocument();
    expect((screen.getByRole('combobox', { name: 'Constructed class' }) as HTMLSelectElement).value).toBe('ロイヤル');
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
    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Alpha Knight' }));

    const previewDialog = screen.getByRole('dialog', { name: 'Alpha Knight preview' });
    expect(previewDialog).toBeInTheDocument();
    expect(within(previewDialog).getByAltText('Alpha Knight enlarged')).toBeInTheDocument();
    expect(within(previewDialog).getByText('Ability Text')).toBeInTheDocument();
    expect(within(previewDialog).getByText('BP01-001')).toBeInTheDocument();
    expect(within(previewDialog).getByText('2 / 2')).toBeInTheDocument();
    expect(within(previewDialog).getByText('[ファンファーレ] テスト能力。')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Alpha Knight preview' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Alpha Knight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close card preview' }));
    expect(screen.queryByRole('dialog', { name: 'Alpha Knight preview' })).not.toBeInTheDocument();
  }, 15000);

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

    mockLoadCardCatalog.mockResolvedValue([...mockCards, duplicateAlpha]);

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
    await renderLoadedDeckBuilder();

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

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('dialog', { name: 'Reset deck confirmation' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Reset deck confirmation' })).not.toBeInTheDocument();
    expect(screen.getByText('1/50')).toBeInTheDocument();
    expect(screen.getByText('1/10')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    expect(screen.queryByRole('dialog', { name: 'Reset deck confirmation' })).not.toBeInTheDocument();
    expect(screen.getByText('0/50')).toBeInTheDocument();
    expect(screen.getByText('0/10')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Constructed class' })).toHaveValue('ロイヤル');
  }, 10000);

  it('prompts before restoring a previous session and restores only after Continue', async () => {
    saveDraft({
      selectedDeckId: null,
      name: 'Draft Resume Test',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    expect(await screen.findByRole('dialog', { name: 'Resume previous session' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Deck Name')).toHaveValue('');

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).queryByText('Alpha Knight')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Draft Resume Test')).toBeInTheDocument();
    });
    expect(screen.getByText('Session restored from this browser')).toBeInTheDocument();
    expect(within(mainDeckSection).getByText('Alpha Knight')).toBeInTheDocument();

    const tokenDeckSection = screen.getByRole('heading', { name: /^Token Deck/ }).nextElementSibling as HTMLElement;
    expect(within(tokenDeckSection).getByText('Knight Token')).toBeInTheDocument();
  });

  it('discards a previous session when Start Fresh is chosen from the restore prompt', async () => {
    saveDraft({
      selectedDeckId: null,
      name: 'Discard Me',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const resumeDialog = await screen.findByRole('dialog', { name: 'Resume previous session' });
    fireEvent.click(within(resumeDialog).getByRole('button', { name: 'Start Fresh' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Resume previous session' })).not.toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Deck Name')).toHaveValue('');
    expect(loadDraft()).toBeNull();
  });

  it('does not show the restore prompt again after Start Fresh clears the pending draft', async () => {
    saveDraft({
      selectedDeckId: null,
      name: 'Discard Once',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    const firstRender = render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const resumeDialog = await screen.findByRole('dialog', { name: 'Resume previous session' });
    fireEvent.click(within(resumeDialog).getByRole('button', { name: 'Start Fresh' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Resume previous session' })).not.toBeInTheDocument();
    });
    expect(loadDraft()).toBeNull();

    firstRender.unmount();

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    expect(screen.queryByRole('dialog', { name: 'Resume previous session' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Deck Name')).toHaveValue('');
  });

  it('restores a loaded saved deck on the next visit after confirmation', async () => {
    const savedDeck = saveDeck({
      name: 'Loaded Session Deck',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDraft({
      selectedDeckId: savedDeck.id,
      name: savedDeck.name,
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    expect(await screen.findByRole('dialog', { name: 'Resume previous session' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Loaded Session Deck')).toBeInTheDocument();
    });

    const tokenDeckSection = screen.getByRole('heading', { name: /^Token Deck/ }).nextElementSibling as HTMLElement;
    expect(within(tokenDeckSection).getByText('Knight Token')).toBeInTheDocument();
  });

  it('reset builder clears the current builder state and removes the saved session', async () => {
    const { unmount } = await renderLoadedDeckBuilder();

    vi.useFakeTimers();
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Builder Reset Test' },
    });
    await flushDraftPersistence();
    expect(loadDraft()).not.toBeNull();
    vi.useRealTimers();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Builder' }));
    expect(screen.getByRole('dialog', { name: 'Reset builder confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Reset builder confirmation' })).not.toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Deck Name')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Deck format' })).toHaveValue('constructed');
    expect(loadDraft()).toBeNull();

    unmount();
    await renderLoadedDeckBuilder();
    expect(screen.queryByRole('dialog', { name: 'Resume previous session' })).not.toBeInTheDocument();
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
    expect(within(screen.getByRole('combobox', { name: 'Crossover class B' })).queryByRole('option', { name: 'Royal' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Crossover class B' }), {
      target: { value: 'ウィッチ' },
    });
    expect(within(screen.getByRole('combobox', { name: 'Crossover class A' })).queryByRole('option', { name: 'Witch' })).not.toBeInTheDocument();

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
    expect(screen.getByText('This Constructed deck requires exactly 1 leader(s) (0/1).')).toBeInTheDocument();
  });

  it('disables adding a fourth effective copy of the same card', async () => {
    const duplicateAlpha = {
      ...mockCards[0],
      id: 'BP01-099',
      image: '/alpha-variant.png',
      rarity: 'PR',
      product_name: 'Promo Pack',
    };

    mockLoadCardCatalog.mockResolvedValue([...mockCards, duplicateAlpha]);

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

  it('updates pagination controls between the first and last library pages', async () => {
    mockLoadCardCatalog.mockResolvedValue(createUniqueCards(mockCards[0], 55));

    await renderLoadedDeckBuilder('Alpha Knight 1');

    const prevButton = screen.getByRole('button', { name: 'Prev' });
    const nextButton = screen.getByRole('button', { name: 'Next' });

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(prevButton).toBeEnabled();
    expect(nextButton).toBeDisabled();
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

    const { container } = await renderLoadedDeckBuilder();

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
    expect(exportedDeck.mainDeck[0]).not.toHaveProperty('related_cards');
    expect(exportedDeck.evolveDeck[0]).not.toHaveProperty('related_cards');

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

  it('auto-adds related tokens when importing a deck from JSON without token entries', async () => {
    importedDeckPayload = {
      deckName: 'JSON Token Import',
      mainDeck: [mockCards[0]],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    };

    stubFileReaderWithImportedDeck();

    const { container } = render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'JSON Token Import.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByDisplayValue('JSON Token Import')).toBeInTheDocument();
    });

    const tokenDeckSection = screen.getByRole('heading', { name: /^Token Deck/ }).nextElementSibling as HTMLElement;
    expect(within(tokenDeckSection).getByText('Knight Token')).toBeInTheDocument();
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

  it('saves a deck to My Decks and reloads it without changing import or export behavior', async () => {
    await renderLoadedDeckBuilder();

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Saved Royal' },
    });

    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('"Saved Royal" was saved.')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    expect(screen.getByRole('dialog', { name: 'My Decks' })).toBeInTheDocument();
    expect(screen.getByText('Saved Royal')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Saved Royal Edited' },
    });
    fireEvent.click(within(screen.getByAltText('Beta Mage').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Load saved deck confirmation' })).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Saved Royal')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).getByText('Alpha Knight')).toBeInTheDocument();
    expect(within(mainDeckSection).queryByText('Beta Mage')).not.toBeInTheDocument();
  });

  it('clears save feedback automatically after the timeout elapses', async () => {
    vi.useFakeTimers();
    await renderLoadedDeckBuilder();

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Timed Save Deck' },
    });
    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('"Timed Save Deck" was saved.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2399);
    });
    expect(screen.getByText('"Timed Save Deck" was saved.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('"Timed Save Deck" was saved.')).not.toBeInTheDocument();
  });

  it('exports saved decks without embedding related card metadata', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:saved-deck');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Saved Export Deck' },
    });
    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const modal = screen.getByRole('dialog', { name: 'My Decks' });

    vi.useFakeTimers();
    fireEvent.click(within(modal).getByRole('button', { name: 'Export' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    const exportedBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const exportedDeck = JSON.parse(await exportedBlob.text());
    expect(exportedDeck.mainDeck[0]).toMatchObject({
      id: 'BP01-001',
      name: 'Alpha Knight',
    });
    expect(exportedDeck.mainDeck[0]).not.toHaveProperty('related_cards');

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:saved-deck');
  });

  it('rejects saving a completely pristine builder state and shows a warning', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('The builder is empty. Add cards or adjust the setup before saving.')).toBeInTheDocument();
    expect(listSavedDecks()).toHaveLength(0);
    expect(screen.getByText('Not saved to My Decks')).toBeInTheDocument();
  });

  it('keeps the status as Not saved to My Decks for an edited builder that has never been saved', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Unsaved Builder' },
    });

    expect(screen.getByText('Not saved to My Decks')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('shows a hover preview for deck entries', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });

    fireEvent.click(
      within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement)
        .getByTitle('Add to Main Deck')
    );

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    const deckCardName = within(mainDeckSection).getByText('Alpha Knight');
    const baseCount = screen.getAllByText('Alpha Knight').length;

    fireEvent.mouseEnter(deckCardName, { clientX: 120, clientY: 140 });

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Knight').length).toBeGreaterThan(baseCount);
    });

    fireEvent.mouseLeave(deckCardName);

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Knight')).toHaveLength(baseCount);
    });
  });

  it('can detach a saved deck into an unsaved copy without clearing the current contents', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Detach Test' },
    });
    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make Unsaved Copy' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Make Unsaved Copy' }));

    expect(screen.getByText('The current deck is now an unsaved copy.')).toBeInTheDocument();
    expect(screen.getByText('Not saved to My Decks')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make Unsaved Copy' })).not.toBeInTheDocument();

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).getByText('Alpha Knight')).toBeInTheDocument();
  });

  it('imports a DeckLog deck from a public code or URL', async () => {
    mockLoadCardCatalog.mockResolvedValue(mockCards);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 4092682,
            title: 'DeckLog Elf',
            game_title_id: 6,
            deck_param1: 'N',
            deck_param2: 'ロイヤル',
            list: [
              { card_number: 'BP01-001', num: 2, card_kind: '・フォロワー・', name: 'Alpha Knight', img: 'BP01/bp01_001.png', custom_param: { class_name: 'ロイヤル' } },
            ],
            sub_list: [
              { card_number: 'EV01-001', num: 1, card_kind: '・フォロワー・エボルヴ・', name: 'Evolve Angel', img: 'EV01/ev01_001.png', custom_param: { class_name: 'ロイヤル' } },
            ],
            p_list: [
              { card_number: 'LDR01-001', num: 1, card_kind: '・リーダー・', name: 'Leader Luna', img: 'LDR01/ldr01_001.png', custom_param: { class_name: 'ロイヤル' } },
            ],
          }),
        } as unknown as Response)
    );

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL'), {
      target: { value: 'https://decklog.bushiroad.com/view/7H9K2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByText('Imported "DeckLog Elf" from DeckLog.')).toBeInTheDocument();
    });

    expect(screen.getByText('Not saved to My Decks')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DeckLog Elf')).toBeInTheDocument();

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    const evolveDeckSection = screen.getByRole('heading', { name: /^Evolve Deck/ }).nextElementSibling as HTMLElement;
    const leaderSection = screen.getByRole('heading', { name: /^Leader/ }).nextElementSibling as HTMLElement;
    const tokenDeckSection = screen.getByRole('heading', { name: /^Token Deck/ }).nextElementSibling as HTMLElement;

    expect(within(mainDeckSection).getByText('Alpha Knight')).toBeInTheDocument();
    expect(within(mainDeckSection).getByText('× 2')).toBeInTheDocument();
    expect(within(evolveDeckSection).getByText('Evolve Angel')).toBeInTheDocument();
    expect(within(leaderSection).getByText('Leader Luna')).toBeInTheDocument();
    expect(within(tokenDeckSection).getByText('Knight Token')).toBeInTheDocument();
  });

  it('closes the DeckLog import modal after a successful import and reopens with an empty input', async () => {
    mockLoadCardCatalog.mockResolvedValue(mockCards);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 4092682,
          title: 'DeckLog Elf',
          game_title_id: 6,
          deck_param1: 'N',
          deck_param2: 'ロイヤル',
          list: [
            { card_number: 'BP01-001', num: 1, card_kind: '・フォロワー・', name: 'Alpha Knight', img: 'BP01/bp01_001.png', custom_param: { class_name: 'ロイヤル' } },
          ],
          sub_list: [],
          p_list: [
            { card_number: 'LDR01-001', num: 1, card_kind: '・リーダー・', name: 'Leader Luna', img: 'LDR01/ldr01_001.png', custom_param: { class_name: 'ロイヤル' } },
          ],
        }),
      } as unknown as Response)
    );

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    const deckLogDialog = screen.getByRole('dialog', { name: 'Import from DeckLog dialog' });
    const deckLogInput = within(deckLogDialog).getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL');

    fireEvent.change(deckLogInput, {
      target: { value: 'https://decklog.bushiroad.com/view/7H9K2' },
    });
    fireEvent.click(within(deckLogDialog).getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Import from DeckLog dialog' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    const reopenedDialog = screen.getByRole('dialog', { name: 'Import from DeckLog dialog' });
    expect(
      within(reopenedDialog).getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL')
    ).toHaveValue('');
  });

  it('closes the DeckLog import modal on cancel and clears the pending input', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    const deckLogDialog = screen.getByRole('dialog', { name: 'Import from DeckLog dialog' });
    const deckLogInput = within(deckLogDialog).getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL');

    fireEvent.change(deckLogInput, {
      target: { value: 'https://decklog.bushiroad.com/view/7H9K2' },
    });
    fireEvent.click(within(deckLogDialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Import from DeckLog dialog' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    const reopenedDialog = screen.getByRole('dialog', { name: 'Import from DeckLog dialog' });
    expect(
      within(reopenedDialog).getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL')
    ).toHaveValue('');
  });

  it('keeps the DeckLog import modal open and preserves the input when import fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)
    );

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.click(screen.getByRole('button', { name: /Import from DeckLog/i }));
    const deckLogDialog = screen.getByRole('dialog', { name: 'Import from DeckLog dialog' });
    const deckLogInput = within(deckLogDialog).getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL');

    fireEvent.change(deckLogInput, {
      target: { value: 'https://decklog.bushiroad.com/view/NOTFOUND' },
    });
    fireEvent.click(within(deckLogDialog).getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Import from DeckLog dialog' })).toBeInTheDocument();
    });

    const dialogAfterFailure = screen.getByRole('dialog', { name: 'Import from DeckLog dialog' });
    expect(
      within(dialogAfterFailure).getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL')
    ).toHaveValue('https://decklog.bushiroad.com/view/NOTFOUND');
    expect(within(dialogAfterFailure).getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  it('keeps the My Decks modal open when load is canceled', async () => {
    await renderLoadedDeckBuilder();

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Load Source' },
    });
    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Unsaved Edit' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const modal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Load' }));

    expect(screen.getByRole('dialog', { name: 'Load saved deck confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('dialog', { name: 'My Decks' })).toBeInTheDocument();
    expect(screen.getByText('Load Source')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Unsaved Edit')).toBeInTheDocument();
  });

  it('disables export from My Decks for an illegal saved deck', async () => {
    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Illegal Saved Deck' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const modal = screen.getByRole('dialog', { name: 'My Decks' });

    expect(within(modal).getByText('Illegal deck')).toBeInTheDocument();
    expect(within(modal).getByText('Resolve deck issues after loading before exporting.')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('blocks initial Save when My Decks reaches the hard limit', async () => {
    seedSavedDecks(200);

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Should Not Save' },
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText(/My Decks has reached the browser limit \(200\)/i)).toBeInTheDocument();
  });

  it('still allows overwriting an existing saved deck at the hard limit', async () => {
    const [loadedDeck] = seedSavedDecks(200, index => ({
      mainDeck: index === 0 ? [mockCards[0]] : [],
      evolveDeck: [],
      leaderCards: [],
      tokenDeck: [],
    }));
    saveDraft({
      selectedDeckId: loadedDeck.id,
      name: loadedDeck.name,
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Updated At Limit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(listSavedDecks()).toHaveLength(200);
    expect(listSavedDecks().some(deck => deck.name === 'Updated At Limit')).toBe(true);
  }, 15000);

  it('keeps a saved draft pending until the user confirms restoration', async () => {
    saveDraft({
      selectedDeckId: null,
      name: 'Restored Draft',
      ruleConfig: {
        format: 'other',
        identityType: 'class',
        selectedClass: null,
        selectedTitle: null,
        selectedClasses: [null, null],
      },
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    render(<DeckBuilder />);

    expect(await screen.findByRole('dialog', { name: 'Resume previous session' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Deck Name')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Restored Draft')).toBeInTheDocument();
      expect(screen.getByText('Session restored from this browser')).toBeInTheDocument();
      expect(screen.getByText('1/50')).toBeInTheDocument();
    });
  }, 15000);

  it('keeps the My Decks modal open when delete is canceled', async () => {
    await renderLoadedDeckBuilder();

    fireEvent.change(screen.getByRole('combobox', { name: 'Deck format' }), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByPlaceholderText('Deck Name'), {
      target: { value: 'Do Not Delete' },
    });
    fireEvent.click(within(screen.getByAltText('Alpha Knight').closest('.glass-panel') as HTMLElement).getByTitle('Add to Main Deck'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const modal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog', { name: 'Delete saved deck confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('dialog', { name: 'My Decks' })).toBeInTheDocument();
    expect(screen.getByText('Do Not Delete')).toBeInTheDocument();
  });

  it('deletes all saved decks without clearing the current builder contents', async () => {
    saveDeck({
      name: 'Bulk Delete A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Bulk Delete B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    render(<DeckBuilder />);
    await screen.findByText('Alpha Knight');

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const initialModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(initialModal).getAllByRole('button', { name: 'Load' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete All' }));

    const deleteAllDialog = screen.getByRole('dialog', { name: 'Delete all saved decks confirmation' });
    expect(deleteAllDialog).toBeInTheDocument();
    fireEvent.click(within(deleteAllDialog).getByRole('button', { name: 'Delete All' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete all saved decks confirmation' })).not.toBeInTheDocument();
    });

    expect(listSavedDecks()).toHaveLength(0);
    expect(screen.getByText('Not saved to My Decks')).toBeInTheDocument();

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).getByText('Beta Mage')).toBeInTheDocument();

    expect(screen.getByRole('dialog', { name: 'My Decks' })).toBeInTheDocument();
    expect(screen.getByText('No saved decks yet. Build a deck and press Save to keep it in this browser.')).toBeInTheDocument();
  });

  it('keeps the My Decks modal open and preserves saved decks when delete all is canceled', async () => {
    saveDeck({
      name: 'Bulk Cancel A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Bulk Cancel B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete All' }));

    const deleteAllDialog = screen.getByRole('dialog', { name: 'Delete all saved decks confirmation' });
    fireEvent.click(within(deleteAllDialog).getByRole('button', { name: 'Cancel' }));

    const modalAfterCancel = screen.getByRole('dialog', { name: 'My Decks' });
    expect(within(modalAfterCancel).getByText('Bulk Cancel A')).toBeInTheDocument();
    expect(within(modalAfterCancel).getByText('Bulk Cancel B')).toBeInTheDocument();
    expect(listSavedDecks().map(deck => deck.name)).toEqual(
      expect.arrayContaining(['Bulk Cancel A', 'Bulk Cancel B'])
    );
    expect(listSavedDecks()).toHaveLength(2);
  });

  it('keeps the current builder contents when delete all is canceled', async () => {
    saveDeck({
      name: 'Bulk Cancel Loaded A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Bulk Cancel Loaded B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const initialModal = screen.getByRole('dialog', { name: 'My Decks' });
    const loadedRow = within(initialModal).getByText('Bulk Cancel Loaded B').closest('div[style*="justify-content: space-between"]') as HTMLElement;
    fireEvent.click(within(loadedRow).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete All' }));

    const deleteAllDialog = screen.getByRole('dialog', { name: 'Delete all saved decks confirmation' });
    fireEvent.click(within(deleteAllDialog).getByRole('button', { name: 'Cancel' }));

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'My Decks' })).toBeInTheDocument();
    expect(listSavedDecks()).toHaveLength(2);
  });

  it('deletes selected saved decks without clearing the current builder contents', async () => {
    saveDeck({
      name: 'Selectable A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Selectable B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const initialModal = screen.getByRole('dialog', { name: 'My Decks' });
    const selectableARow = within(initialModal).getByText('Selectable A').closest('div[style*="justify-content: space-between"]') as HTMLElement;
    fireEvent.click(within(selectableARow).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Select' }));
    fireEvent.click(within(decksModal).getByRole('checkbox', { name: 'Select Selectable A' }));
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete Selected' }));

    const deleteSelectedDialog = screen.getByRole('dialog', { name: 'Delete selected saved decks confirmation' });
    fireEvent.click(within(deleteSelectedDialog).getByRole('button', { name: 'Delete Selected' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete selected saved decks confirmation' })).not.toBeInTheDocument();
    });

    expect(listSavedDecks().map(deck => deck.name)).toEqual(['Selectable B']);
    expect(screen.getByText('Not saved to My Decks')).toBeInTheDocument();

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).getByText('Alpha Knight')).toBeInTheDocument();
  });

  it('returns My Decks to normal mode after deleting selected decks', async () => {
    saveDeck({
      name: 'Selectable Reset A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Selectable Reset B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const initialModal = screen.getByRole('dialog', { name: 'My Decks' });
    const selectableARow = within(initialModal).getByText('Selectable Reset A').closest('div[style*="justify-content: space-between"]') as HTMLElement;
    fireEvent.click(within(selectableARow).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Select' }));
    fireEvent.click(within(decksModal).getByRole('checkbox', { name: 'Select Selectable Reset A' }));
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete Selected' }));

    const deleteSelectedDialog = screen.getByRole('dialog', { name: 'Delete selected saved decks confirmation' });
    fireEvent.click(within(deleteSelectedDialog).getByRole('button', { name: 'Delete Selected' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete selected saved decks confirmation' })).not.toBeInTheDocument();
    });

    const modalAfterDelete = screen.getByRole('dialog', { name: 'My Decks' });
    expect(within(modalAfterDelete).getByRole('button', { name: 'Select' })).toBeInTheDocument();
    expect(within(modalAfterDelete).queryByRole('button', { name: 'Cancel Selection' })).not.toBeInTheDocument();
    expect(within(modalAfterDelete).queryByRole('button', { name: 'Delete Selected' })).not.toBeInTheDocument();
    expect(within(modalAfterDelete).queryByRole('checkbox', { name: 'Select Selectable Reset B' })).not.toBeInTheDocument();
  });

  it('keeps selection mode and selected decks when delete selected is canceled', async () => {
    saveDeck({
      name: 'Selectable Cancel A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Selectable Cancel B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Select' }));

    const selectableCheckbox = within(decksModal).getByRole('checkbox', { name: 'Select Selectable Cancel A' });
    fireEvent.click(selectableCheckbox);
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete Selected' }));

    const deleteSelectedDialog = screen.getByRole('dialog', { name: 'Delete selected saved decks confirmation' });
    fireEvent.click(within(deleteSelectedDialog).getByRole('button', { name: 'Cancel' }));

    const modalAfterCancel = screen.getByRole('dialog', { name: 'My Decks' });
    expect(within(modalAfterCancel).getByRole('button', { name: 'Cancel Selection' })).toBeInTheDocument();
    expect(within(modalAfterCancel).getByRole('button', { name: 'Delete Selected' })).toBeInTheDocument();
    expect(within(modalAfterCancel).getByRole('checkbox', { name: 'Select Selectable Cancel A' })).toBeChecked();
    expect(listSavedDecks().map(deck => deck.name)).toEqual(
      expect.arrayContaining(['Selectable Cancel A', 'Selectable Cancel B'])
    );
    expect(listSavedDecks()).toHaveLength(2);
  });

  it('keeps the current builder contents when delete selected is canceled', async () => {
    saveDeck({
      name: 'Selectable Loaded A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Selectable Loaded B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const initialModal = screen.getByRole('dialog', { name: 'My Decks' });
    const loadedRow = within(initialModal).getByText('Selectable Loaded B').closest('div[style*="justify-content: space-between"]') as HTMLElement;
    fireEvent.click(within(loadedRow).getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Select' }));
    fireEvent.click(within(decksModal).getByRole('checkbox', { name: 'Select Selectable Loaded A' }));
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Delete Selected' }));

    const deleteSelectedDialog = screen.getByRole('dialog', { name: 'Delete selected saved decks confirmation' });
    fireEvent.click(within(deleteSelectedDialog).getByRole('button', { name: 'Cancel' }));

    const mainDeckSection = screen.getByRole('heading', { name: /^Main Deck/ }).nextElementSibling as HTMLElement;
    expect(within(mainDeckSection).getByText('Beta Mage')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'My Decks' })).toBeInTheDocument();
    expect(listSavedDecks()).toHaveLength(2);
  });

  it('reopens My Decks in normal mode after closing it during selection mode', async () => {
    saveDeck({
      name: 'Selectable Close A',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[0]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });
    saveDeck({
      name: 'Selectable Close B',
      ruleConfig: otherRuleConfig,
      deckState: {
        mainDeck: [mockCards[2]],
        evolveDeck: [],
        leaderCards: [],
        tokenDeck: [],
      },
    });

    await renderLoadedDeckBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const decksModal = screen.getByRole('dialog', { name: 'My Decks' });
    fireEvent.click(within(decksModal).getByRole('button', { name: 'Select' }));
    expect(within(decksModal).getByRole('button', { name: 'Cancel Selection' })).toBeInTheDocument();
    expect(within(decksModal).getByRole('checkbox', { name: 'Select Selectable Close A' })).toBeInTheDocument();

    fireEvent.click(within(decksModal).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'My Decks' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'My Decks' }));
    const reopenedModal = screen.getByRole('dialog', { name: 'My Decks' });
    expect(within(reopenedModal).getByRole('button', { name: 'Select' })).toBeInTheDocument();
    expect(within(reopenedModal).queryByRole('button', { name: 'Cancel Selection' })).not.toBeInTheDocument();
    expect(within(reopenedModal).queryByRole('checkbox', { name: 'Select Selectable Close A' })).not.toBeInTheDocument();
  });
});
