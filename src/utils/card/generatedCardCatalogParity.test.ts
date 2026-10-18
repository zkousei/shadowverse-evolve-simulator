// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CardInstance } from '../../components/Card';
import {
  getAvailableExpansions, getAvailableProductNames, getAvailableRarities,
  getAvailableSubtypeTags, getAvailableTitles, type DeckBuilderCardData,
} from '../../models/deckBuilderCard';
import { CLASS } from '../../models/class';
import { createDefaultDeckRuleConfig, getImportedDeckRuleConfig } from '../../models/deckRule';
import type { DeckState } from '../../models/deckState';
import { mergeCardCatalogs } from './cardCatalog';
import { openGeneratedCardCatalog } from './generatedCardCatalog';
import { createGeneratedDeckBuilderCatalog } from '../deckBuilder/generatedDeckBuilderCatalog';
import { buildDeckBuilderCatalogView, type DeckBuilderCatalogFilters } from '../deckBuilder/deckBuilderCatalog';
import { getDeckValidationMessages, sanitizeImportedDeckState } from '../deckBuilder/deckBuilderRules';
import {
  restoreDraftToSnapshot, restoreSavedDeckToSnapshot, serializeDeckState, type SavedDeckRecordV1,
} from '../deck/deckStorage';
import { buildGameBoardCatalogMetadata, buildGameBoardCatalogResources } from '../gameBoard/gameBoardCatalog';
import { buildLegalSavedDeckOptions } from '../gameBoard/gameBoardSavedDecks';

type IndexCard = DeckBuilderCardData & { detail_group: string };
type Manifest = {
  schemaVersion: number;
  counts: { total: number };
  index: { file: string };
  details: Record<string, { file: string }>;
};
const root = fileURLToPath(new URL('../../../', import.meta.url));
const readJson = <T,>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const baseFilters: DeckBuilderCatalogFilters = {
  search: '', costFilter: 'All', expansionFilter: 'All', classFilter: 'All',
  cardTypeFilter: 'All', rarityFilter: 'All', productNameFilter: 'All',
  selectedSubtypeTags: [], deckSectionFilter: 'All', hideSameNameVariants: false,
  showPreviewCards: false, page: 0, pageSize: 50,
};
const instance = (card: DeckBuilderCardData, zone = 'field-host'): CardInstance => ({
  id: `${card.id}-instance`, cardId: card.id, name: card.name, image: card.image,
  zone, owner: 'host', isTapped: false, isFlipped: false, counters: { atk: 0, hp: 0 },
  isEvolveCard: card.is_evolve_card, isTokenCard: card.is_token,
});

// Generate from the actual source files in a temporary directory. Nothing in
// public/ or the runtime loader is replaced by this compatibility test.
describe('generated card catalog compatibility', () => {
  let output: string | undefined;
  let original: DeckBuilderCardData[];
  let restored: DeckBuilderCardData[];
  let index: IndexCard[];
  let originalResources: ReturnType<typeof buildGameBoardCatalogResources>;
  let restoredResources: ReturnType<typeof buildGameBoardCatalogResources>;

  it('reads actual generated artifacts through the versioned reader without changing any card data', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const path = String(input);
      if (!path.startsWith('/catalog/')) throw new Error(`Unexpected request: ${path}`);
      return new Response(readFileSync(join(output!, path.slice('/catalog/'.length)), 'utf8'));
    });
    try {
      const catalog = await openGeneratedCardCatalog('/catalog');
      expect(catalog.index).toEqual(index);
      expect(request).toHaveBeenCalledTimes(2);
      const details = await catalog.loadCards(original.map(card => card.id));
      expect(details).toEqual(original);
      const adapter = createGeneratedDeckBuilderCatalog(catalog);
      expect(await adapter.loadAvailable(original.map(card => card.id))).toEqual(original);
      expect(adapter.knownCards()).toEqual(original);
      expect(request).toHaveBeenCalledTimes(2 + new Set(index.map(entry => entry.detail_group)).size);
      const source = original.find(card => card.related_cards?.length);
      expect(source).toBeDefined();
      const related = await catalog.loadCardsWithRelated([source!.id]);
      expect(related.length).toBeGreaterThan(1);
      for (const entry of related) expect(entry).toEqual(original.find(card => card.id === entry.id));
    } finally {
      request.mockRestore();
    }
  });

  beforeAll(() => {
    output = mkdtempSync(join(tmpdir(), 'card-catalog-parity-'));
    execFileSync('python3', ['-m', 'tools.card_data.generate_catalog', '--output', output], {
      cwd: root, encoding: 'utf8',
    });
    const manifest = readJson<Manifest>(join(output, 'manifest.json'));
    index = readJson<IndexCard[]>(join(output, manifest.index.file));
    const details = new Map<string, DeckBuilderCardData>();
    for (const group of Object.values(manifest.details)) {
      for (const card of readJson<DeckBuilderCardData[]>(join(output, group.file))) details.set(card.id, card);
    }
    restored = index.map(entry => {
      const card = details.get(entry.id);
      if (!card) throw new Error(`Generated detail missing for ${entry.id}`);
      return card;
    });
    original = mergeCardCatalogs(
      readJson<DeckBuilderCardData[]>(join(root, 'public/cards_detailed.json')),
      readJson<DeckBuilderCardData[]>(join(root, 'public/cards_preview.json')),
    );
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.counts.total).toBe(original.length);
    originalResources = buildGameBoardCatalogResources(original);
    restoredResources = buildGameBoardCatalogResources(restored);
  });

  afterAll(() => { if (output) rmSync(output, { recursive: true, force: true }); });

  it('reconstructs every merged record and preserves all metadata and order', () => {
    expect(restored).toEqual(original);
    expect(index.map(card => card.id)).toEqual(original.map(card => card.id));
    expect(index.some(card => 'ability_text' in card || 'faces' in card)).toBe(false);
  });

  it('preserves all available library filter options', () => {
    for (const options of [getAvailableExpansions, getAvailableProductNames,
      getAvailableRarities, getAvailableSubtypeTags, getAvailableTitles]) {
      expect(options(index)).toEqual(options(original));
    }
  });

  it.each([
    { label: 'unconfigured', rule: createDefaultDeckRuleConfig() },
    { label: 'constructed class', rule: { ...createDefaultDeckRuleConfig(), selectedClass: CLASS.ROYAL } },
    { label: 'constructed title', rule: { ...createDefaultDeckRuleConfig(), identityType: 'title' as const, selectedTitle: 'ウマ娘 プリティーダービー' } },
    { label: 'crossover', rule: { ...createDefaultDeckRuleConfig(), format: 'crossover' as const, selectedClasses: [CLASS.ROYAL, CLASS.WITCH] as [typeof CLASS.ROYAL, typeof CLASS.WITCH] } },
    { label: 'other', rule: { ...createDefaultDeckRuleConfig(), format: 'other' as const } },
  ])('preserves filtered IDs, ordering and paging for $label', ({ rule }) => {
    const patches: Partial<DeckBuilderCatalogFilters>[] = [
      {}, { showPreviewCards: true }, { hideSameNameVariants: true }, { page: 1 },
      { costFilter: '7+' }, { costFilter: '0' }, { costFilter: '-' },
      { expansionFilter: 'BP22' }, { classFilter: CLASS.ROYAL }, { cardTypeFilter: 'spell' },
      { rarityFilter: 'LG' }, { productNameFilter: original[0].product_name },
      { selectedSubtypeTags: getAvailableSubtypeTags(original).slice(0, 2) },
      { deckSectionFilter: 'evolve' }, { deckSectionFilter: 'token' },
      { search: original[0].name }, { search: original.at(-1)!.name, showPreviewCards: true },
    ];
    for (const patch of patches) {
      const filters = { ...baseFilters, ...patch };
      const before = buildDeckBuilderCatalogView(original, rule, filters);
      const after = buildDeckBuilderCatalogView(index, rule, filters);
      expect(after.totalPages).toBe(before.totalPages);
      for (const key of ['filteredCards', 'displayCards', 'paginatedCards'] as const) {
        expect(after[key].map(card => card.id)).toEqual(before[key].map(card => card.id));
      }
    }
  });

  it('preserves detailed faces, stats, token/link classification and lookups', () => {
    for (const key of ['catalogById', 'statLookup', 'detailLookup', 'fieldLinkCardIds', 'tokenManualLinkCardIds'] as const) {
      expect(restoredResources[key]).toEqual(originalResources[key]);
    }
  });

  it('builds identical stats and rule sets from the actual generated index without full details', () => {
    const metadata = buildGameBoardCatalogMetadata(index);
    expect(metadata.statLookup).toEqual(originalResources.statLookup);
    expect(metadata.fieldLinkCardIds).toEqual(originalResources.fieldLinkCardIds);
    expect(metadata.tokenManualLinkCardIds).toEqual(originalResources.tokenManualLinkCardIds);
    expect(metadata).not.toHaveProperty('detailLookup');
  });

  it('preserves eligibility for every actual card and candidates across all eligible sources using the index', () => {
    const metadata = buildGameBoardCatalogMetadata(index);
    const mainByName = new Map<string, CardInstance[]>();
    const relatedNamesByName = new Map<string, Set<string>>();
    for (const card of original) {
      if (card.deck_section === 'main') {
        const members = mainByName.get(card.name) ?? [];
        members.push(instance(card));
        mainByName.set(card.name, members);
      }
      // Include all same-name variants' references, even when the selected
      // source has none. Resolvers still decide title/kind/family validity.
      const names = relatedNamesByName.get(card.name) ?? new Set([card.name]);
      for (const ref of card.related_cards ?? []) names.add(ref.name);
      relatedNamesByName.set(card.name, names);
    }
    const fullBoard = [...mainByName.values()].flat();
    let evolveMatches = 0;
    let linkMatches = 0;
    for (const card of original) {
      const source = instance(card, 'evolveDeck-host');
      const eligible = originalResources.evolveAutoAttachResolver.isEligibleSource(source);
      expect(metadata.evolveAutoAttachResolver.isEligibleSource(source), card.id).toBe(eligible);
      const linkEligible = originalResources.fieldLinkAutoAttachResolver.isEligibleSource(source);
      expect(metadata.fieldLinkAutoAttachResolver.isEligibleSource(source), card.id).toBe(linkEligible);
      if (eligible) {
        const board = [...relatedNamesByName.get(card.name)!].flatMap(name => mainByName.get(name) ?? []);
        const expected = originalResources.evolveAutoAttachResolver.resolveCandidates(source, board);
        evolveMatches += expected.length;
        expect(metadata.evolveAutoAttachResolver.resolveCandidates(source, board), card.id).toEqual(expected);
      }
      if (linkEligible) {
        const expected = originalResources.fieldLinkAutoAttachResolver.resolveCandidates(source, fullBoard);
        linkMatches += expected.length;
        expect(metadata.fieldLinkAutoAttachResolver.resolveCandidates(source, fullBoard), card.id).toEqual(expected);
      }
    }
    expect(evolveMatches).toBeGreaterThan(0);
    expect(linkMatches).toBeGreaterThan(0);
  });

  it('preserves evolve and field-link candidates using actual related-card families', () => {
    const evolveSources = original.filter(card => (
      ['evolve_follower', 'evolve_amulet'].includes(card.card_kind_normalized ?? '') && card.related_cards?.length
    )).slice(0, 20);
    expect(evolveSources.length).toBeGreaterThan(0);
    let evolveMatches = 0;
    for (const source of evolveSources) {
      const relatedNames = new Set(source.related_cards!.map(card => card.name));
      const board = original.filter(card => card.deck_section === 'main' && relatedNames.has(card.name)).map(card => instance(card));
      const sourceInstance = instance(source, 'evolveDeck-host');
      const before = originalResources.evolveAutoAttachResolver.resolveCandidates(sourceInstance, board);
      const after = restoredResources.evolveAutoAttachResolver.resolveCandidates(sourceInstance, board);
      evolveMatches += before.length;
      expect(after).toEqual(before);
    }
    expect(evolveMatches).toBeGreaterThan(0);
    const board = original.filter(card => card.deck_section === 'main').map(card => instance(card));
    let linkMatches = 0;
    for (const id of originalResources.fieldLinkCardIds) {
      const source = instance(originalResources.catalogById[id], 'evolveDeck-host');
      const before = originalResources.fieldLinkAutoAttachResolver.resolveCandidates(source, board);
      linkMatches += before.length;
      expect(restoredResources.fieldLinkAutoAttachResolver.resolveCandidates(source, board)).toEqual(before);
    }
    expect(linkMatches).toBeGreaterThan(0);
  });

  it('preserves saved decks, drafts, validation, token additions and missing-ID handling', () => {
    const sample = readJson<Record<string, unknown> & DeckState>(join(root, 'public/sample-decks/constructed-royal-sample.json'));
    const deckState: DeckState = {
      mainDeck: sample.mainDeck, evolveDeck: sample.evolveDeck,
      leaderCards: sample.leaderCards, tokenDeck: sample.tokenDeck ?? [],
    };
    const ruleConfig = getImportedDeckRuleConfig(sample);
    const record: SavedDeckRecordV1 = {
      schemaVersion: 1, id: 'parity-deck', name: 'Parity Deck',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      ruleConfig, sections: serializeDeckState(deckState),
    };
    expect(restoreSavedDeckToSnapshot(record, restored)).toEqual(restoreSavedDeckToSnapshot(record, original));
    const draft = { ...record, selectedDeckId: record.id, lastEditedAt: record.updatedAt };
    expect(restoreDraftToSnapshot(draft, restored)).toEqual(restoreDraftToSnapshot(draft, original));
    const before = sanitizeImportedDeckState(deckState, original, ruleConfig);
    const after = sanitizeImportedDeckState(deckState, restored, ruleConfig);
    expect(after).toEqual(before);
    expect(getDeckValidationMessages(after, ruleConfig)).toEqual([]);
    expect(buildLegalSavedDeckOptions([record], restored, key => key)).toEqual(buildLegalSavedDeckOptions([record], original, key => key));
    const missing = { ...record, sections: { ...record.sections, main: [{ cardId: 'MISSING-001', count: 1 }] } };
    const restoredMissing = restoreSavedDeckToSnapshot(missing, restored);
    expect(restoredMissing).toEqual(restoreSavedDeckToSnapshot(missing, original));
    expect(restoredMissing.missingCardIds).toContain('MISSING-001');
  });

  it('preserves automatic related-token additions from actual catalog references', () => {
    const parent = original.find(card => card.deck_section === 'main' && card.related_cards?.some(
      related => originalResources.catalogById[related.id]?.card_kind_normalized === 'token_follower',
    ));
    expect(parent).toBeDefined();
    const state: DeckState = { mainDeck: [parent!], evolveDeck: [], leaderCards: [], tokenDeck: [] };
    const rule = { ...createDefaultDeckRuleConfig(), format: 'other' as const };
    const before = sanitizeImportedDeckState(state, original, rule);
    expect(before.tokenDeck.length).toBeGreaterThan(0);
    expect(sanitizeImportedDeckState(state, restored, rule)).toEqual(before);
    expect(serializeDeckState(sanitizeImportedDeckState(state, index, rule))).toEqual(serializeDeckState(before));
  });
});
