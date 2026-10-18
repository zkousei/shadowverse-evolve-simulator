import { execFileSync } from 'node:child_process';
import { CLASS_VALUES } from '../../models/class';
import { CARD_KIND_NORMALIZED_VALUES, DECK_SECTION_VALUES } from '../../models/cardClassification';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openGeneratedCardCatalog, type GeneratedCardDetails, type GeneratedCardIndexEntry } from './generatedCardCatalog';

const encode = (value: unknown) => JSON.stringify(value) + '\n';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const card = (id: string, extra = {}) => ({
  id, name: `カード ${id}`, image: `/${id}.png`, catalog_status: 'released', ...extra,
});
const fullCards = () => [
  card('BP01-001', { related_cards: [{ id: 'TK01-001', name: 'トークン' }], ability_text: '能力\n本文', faces: [{ side: 'back', name: '裏面' }], extension: { keep: null } }),
  card('BP01-002'),
  card('TK01-001', { related_cards: [{ id: 'BP01-001', name: '元カード' }] }),
];
const fixture = (cards = fullCards(), transformIndex = (index: Record<string, unknown>[]) => index, transformFile = (_name: string, text: string) => text, schemaVersion = 1) => {
  const groups = new Map<string, typeof cards>();
  for (const entry of cards) {
    const group = entry.id.split('-')[0];
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  const index = transformIndex(cards.map(entry => {
    const summary = Object.fromEntries(Object.entries(entry).filter(([key]) => !['ability_text', 'faces', 'extension'].includes(key)));
    return { ...summary, detail_group: entry.id.split('-')[0] };
  }));
  const files = new Map<string, string>([['index.json', encode(index)]]);
  for (const [group, entries] of groups) files.set(`details/${group}.json`, encode(entries));
  for (const [name, text] of files) files.set(name, transformFile(name, text));
  const hashes = Object.fromEntries([...files].sort(([a], [b]) => a < b ? -1 : 1).map(([name, text]) => [name, hash(text)]));
  const version = hash(encode({ files: hashes, schemaVersion }));
  const descriptor = (name: string, count: number) => {
    const text = files.get(name)!;
    return { file: `versions/${version}/${name}`, count, bytes: Buffer.byteLength(text), gzipBytes: 1, sha256: hash(text) };
  };
  const manifest = {
    schemaVersion, catalogVersion: version,
    counts: { released: cards.length, preview: 0, total: cards.length },
    index: descriptor('index.json', index.length),
    details: Object.fromEntries([...groups].map(([group, entries]) => [group, descriptor(`details/${group}.json`, entries.length)])),
  };
  const routes = new Map([...files].map(([name, text]) => [`/catalog/versions/${version}/${name}`, text]));
  routes.set('/catalog/manifest.json', encode(manifest));
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    void options;
    const text = routes.get(path);
    return new Response(text ?? 'Missing', { status: text === undefined ? 404 : 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { manifest, index, routes, fetchMock, version };
};
const deferred = () => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; });
  return { promise, resolve };
};

afterEach(() => vi.unstubAllGlobals());

describe('generated card catalog reader', () => {
  it('keeps summaries outside the verified full-detail type boundary', () => {
    const summaryIsComplete: GeneratedCardIndexEntry extends GeneratedCardDetails ? true : false = false;
    expect(summaryIsComplete).toBe(false);
  });

  it('opens only the manifest and index; returns complete requested details in caller order', async () => {
    const { fetchMock, version } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog/');
    expect(catalog.version).toBe(version);
    expect(catalog.index.map(entry => entry.id)).toEqual(fullCards().map(entry => entry.id));
    expect(catalog.index[0]).not.toHaveProperty('ability_text');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/catalog/manifest.json', { cache: 'no-cache' });
    expect(await catalog.loadCards(['BP01-002', 'BP01-001', 'BP01-001'])).toEqual([fullCards()[1], fullCards()[0], fullCards()[0]]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await catalog.loadCards([])).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares pending group work, caches validated details and protects shared records from mutation', async () => {
    const { fetchMock, routes, manifest } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog');
    const pending = deferred();
    fetchMock.mockImplementationOnce(() => pending.promise);
    const first = catalog.loadCards(['BP01-001']);
    const second = catalog.loadCards(['BP01-002']);
    pending.resolve(new Response(routes.get(`/catalog/${manifest.details.BP01.file}`)));
    const [a, b] = await Promise.all([first, second]);
    expect(a[0]).toEqual(fullCards()[0]);
    expect(b[0]).toEqual(fullCards()[1]);
    expect(Object.isFrozen(catalog.index)).toBe(true);
    expect(Object.isFrozen(a[0])).toBe(true);
    expect(Object.isFrozen(a[0].faces)).toBe(true);
    await catalog.loadCards(['BP01-001']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('resolves cross-group related cards transitively without looping or duplicate IDs', async () => {
    const { fetchMock } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog');
    expect(await catalog.loadCardsWithRelated(['BP01-001', 'BP01-001'])).toEqual([fullCards()[0], fullCards()[2]]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects unknown IDs before starting any detail request', async () => {
    const { fetchMock } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog');
    await expect(catalog.loadCards(['BP01-001', 'missing'])).rejects.toThrow();
    await expect(catalog.loadCardsWithRelated(['missing'])).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['http', 'network', 'json', 'checksum', 'length'] as const)('rejects concurrent callers on %s failure and retries the group later', async failure => {
    const { fetchMock, routes, manifest } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog');
    const original = routes.get(`/catalog/${manifest.details.BP01.file}`)!;
    fetchMock.mockImplementationOnce(async () => {
      if (failure === 'network') throw new Error('offline');
      if (failure === 'http') return new Response('unavailable', { status: 503 });
      if (failure === 'json') return new Response('{');
      if (failure === 'length') return new Response(original + ' ');
      return new Response(original.replace('能力', '異常'));
    });
    const results = await Promise.allSettled([catalog.loadCards(['BP01-001']), catalog.loadCards(['BP01-002'])]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await expect(catalog.loadCards(['BP01-001'])).resolves.toEqual([fullCards()[0]]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not return a partial result when one group fails; successful groups remain usable', async () => {
    const { routes, manifest } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog');
    const path = `/catalog/${manifest.details.TK01.file}`;
    const original = routes.get(path)!;
    routes.delete(path);
    await expect(catalog.loadCardsWithRelated(['BP01-001'])).rejects.toThrow();
    routes.set(path, original);
    await expect(catalog.loadCardsWithRelated(['BP01-001'])).resolves.toEqual([fullCards()[0], fullCards()[2]]);
  });

  it('pins an opened catalog to its version even if the manifest changes', async () => {
    const old = fixture();
    const oldCatalog = await openGeneratedCardCatalog('/catalog');
    const updatedCards = fullCards();
    updatedCards[0].name = '更新後';
    const fresh = fixture(updatedCards);
    for (const [path, data] of old.routes) if (!path.endsWith('/manifest.json')) fresh.routes.set(path, data);
    const newCatalog = await openGeneratedCardCatalog('/catalog');
    expect(oldCatalog.version).not.toBe(newCatalog.version);
    expect((await newCatalog.loadCards(['BP01-001']))[0].name).toBe('更新後');
    expect((await oldCatalog.loadCards(['BP01-001']))[0].name).toBe(fullCards()[0].name);
  });

  it.each([3, 4])('rejects unsupported schema %s before requesting index or details', async schema => {
    const { fetchMock } = fixture([], index => index, (_name, text) => text, schema);
    await expect(openGeneratedCardCatalog('/catalog')).rejects.toThrow(/unsupported version/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['unsupported schema', (m: ReturnType<typeof fixture>['manifest']) => { m.schemaVersion = 3; }],
    ['traversal path', (m: ReturnType<typeof fixture>['manifest']) => { m.index.file = '../index.json'; }],
    ['external path', (m: ReturnType<typeof fixture>['manifest']) => { m.details.BP01.file = 'https://example.com/cards.json'; }],
    ['other version', (m: ReturnType<typeof fixture>['manifest']) => { m.catalogVersion = 'f'.repeat(64); }],
    ['wrong count', (m: ReturnType<typeof fixture>['manifest']) => { m.counts.total++; }],
    ['invalid checksum', (m: ReturnType<typeof fixture>['manifest']) => { m.index.sha256 = 'invalid'; }],
    ['fractional count', (m: ReturnType<typeof fixture>['manifest']) => { m.index.count = 1.5; }],
  ])('rejects %s before loading referenced files', async (_label, change) => {
    const { manifest, routes, fetchMock } = fixture();
    change(manifest);
    routes.set('/catalog/manifest.json', encode(manifest));
    await expect(openGeneratedCardCatalog('/catalog')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['duplicate ID', (index: Record<string, unknown>[]) => index.map((entry, i) => i === 1 ? index[0] : entry)],
    ['misplaced group', (index: Record<string, unknown>[]) => index.map(entry => ({ ...entry, detail_group: 'missing' }))],
    ['missing reference', (index: Record<string, unknown>[]) => index.map(entry => ({ ...entry, related_cards: [{ id: 'missing', name: 'なし' }] }))],
    ['detail-only field', (index: Record<string, unknown>[]) => index.map(entry => ({ ...entry, ability_text: 'not a summary' }))],
  ])('rejects an internally hashed index with %s', async (_label, change) => {
    fixture(fullCards(), change);
    await expect(openGeneratedCardCatalog('/catalog')).rejects.toThrow();
  });

  it('compares detail projection to index even when the file checksum is valid', async () => {
    fixture(fullCards(), index => index.map(entry => ({ ...entry, name: '不一致' })));
    const catalog = await openGeneratedCardCatalog('/catalog');
    await expect(catalog.loadCards(['BP01-001'])).rejects.toThrow();
    await expect(catalog.loadCards(['BP01-002'])).rejects.toThrow();
  });

  it.each([
    ['duplicate detail ID', (cards: Record<string, unknown>[]) => [cards[0], cards[0]]],
    ['missing detail ID', (cards: Record<string, unknown>[]) => cards.slice(0, 1)],
    ['extra detail ID', (cards: Record<string, unknown>[]) => [...cards, card('BP01-999')]],
    ['misplaced detail ID', (cards: Record<string, unknown>[]) => [cards[0], card('TK01-001')]],
    ['wrong field type', (cards: Record<string, unknown>[]) => cards.map(entry => ({ ...entry, is_token: 'false' }))],
    ['null face name', (cards: Record<string, unknown>[]) => cards.map(entry => ({ ...entry, faces: [{ side: 'back', name: null }] }))],
    ['malformed face', (cards: Record<string, unknown>[]) => cards.map(entry => ({ ...entry, faces: [{ side: 1 }] }))],
  ])('rejects a correctly hashed group containing %s', async (_label, change) => {
    fixture(fullCards(), index => index, (name, text) => name === 'details/BP01.json' ? encode(change(JSON.parse(text))) : text);
    const catalog = await openGeneratedCardCatalog('/catalog');
    await expect(catalog.loadCards(['BP01-001'])).rejects.toThrow();
  });

  it('rejects invalid JSON even with matching bytes and checksum', async () => {
    fixture(fullCards(), index => index, (name, text) => name === 'details/BP01.json' ? '{' : text);
    const catalog = await openGeneratedCardCatalog('/catalog');
    await expect(catalog.loadCards(['BP01-001'])).rejects.toThrow();
  });

  it('snapshots requested IDs so caller mutation during fetching cannot change the result', async () => {
    const { fetchMock, routes, manifest } = fixture();
    const catalog = await openGeneratedCardCatalog('/catalog');
    const pending = deferred();
    fetchMock.mockImplementationOnce(() => pending.promise);
    const ids = ['BP01-001'];
    const loaded = catalog.loadCards(ids);
    ids[0] = 'TK01-001';
    pending.resolve(new Response(routes.get(`/catalog/${manifest.details.BP01.file}`)));
    expect(await loaded).toEqual([fullCards()[0]]);
  });

  it('accepts an empty generated catalog without fetching details', async () => {
    const { fetchMock } = fixture([]);
    const catalog = await openGeneratedCardCatalog('/catalog');
    expect(catalog.index).toEqual([]);
    expect(await catalog.loadCardsWithRelated([])).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['http', 'network', 'json', 'index'])('allows a fresh open after initial %s failure', async failure => {
    const { routes, manifest, fetchMock } = fixture();
    const original = routes.get(`/catalog/${manifest.index.file}`)!;
    if (failure === 'index') routes.set(`/catalog/${manifest.index.file}`, 'corrupt');
    else fetchMock.mockImplementationOnce(async () => {
      if (failure === 'network') throw new Error('offline');
      return new Response(failure === 'json' ? '{' : 'unavailable', { status: failure === 'http' ? 503 : 200 });
    });
    await expect(openGeneratedCardCatalog('/catalog')).rejects.toThrow();
    routes.set(`/catalog/${manifest.index.file}`, original);
    const catalog = await openGeneratedCardCatalog('/catalog');
    expect(catalog.index).toHaveLength(3);
  });

  it.each(['/catalog/../other', 'https://example.com/catalog', '/catalog?x=1'])('rejects unsafe base path %s without fetching', async path => {
    const { fetchMock } = fixture();
    await expect(openGeneratedCardCatalog(path)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});


it('reads schema 2 compact rows as the exact same frozen summaries and complete details', async () => {
  const fields = ['id', 'name', 'image', 'class', 'title', 'type', 'subtype', 'rarity', 'product_name', 'cost', 'atk', 'hp', 'card_kind_normalized', 'deck_section', 'is_token', 'is_evolve_card', 'is_deck_build_legal', 'catalog_status', 'related_cards', 'detail_group'];
  const { index, version, fetchMock } = fixture(fullCards(), index => index, (name, text) => {
    if (name !== 'index.json') return text;
    const entries: Record<string, unknown>[] = JSON.parse(text);
    return encode({ encoding: 'rows-v1', fields, rows: entries.map(entry => [
      fields.reduce((mask, field, bit) => field in entry ? mask + 2 ** bit : mask, 0),
      ...fields.filter(field => field in entry).map(field => entry[field]),
    ]) });
  }, 2);
  const catalog = await openGeneratedCardCatalog('/catalog');
  expect(catalog.version).toBe(version);
  expect(catalog.index).toEqual(index);
  expect(catalog.index.every(Object.isFrozen)).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(await catalog.loadCardsWithRelated(['BP01-001'])).toEqual([fullCards()[0], fullCards()[2]]);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});


it('limits detail work across overlapping loadCards calls, preserving caller order, duplicates and queued sharing', async () => {
  const cards = Array.from({ length: 8 }, (_, i) => card(`G${i}-001`));
  const { fetchMock, routes, manifest } = fixture(cards);
  const catalog = await openGeneratedCardCatalog('/catalog');
  const gates = Object.fromEntries(cards.map((_card, i) => [`G${i}`, deferred()]));
  const started: string[] = [];
  fetchMock.mockImplementation(async path => {
    const group = path.split('/').pop()!.replace('.json', '');
    started.push(group);
    return gates[group].promise;
  });
  const first = catalog.loadCards([cards[0].id, cards[4].id, cards[1].id, cards[0].id]);
  const second = catalog.loadCards([cards[2].id, cards[3].id, cards[4].id, cards[5].id, cards[6].id, cards[7].id]);
  expect(started).toEqual(['G0', 'G4', 'G1', 'G2']);
  const finish = (group: string) => gates[group].resolve(new Response(routes.get(`/catalog/${manifest.details[group].file}`)));
  finish('G1');
  await vi.waitFor(() => expect(started).toEqual(['G0', 'G4', 'G1', 'G2', 'G3']));
  Object.keys(gates).forEach(finish);
  expect(await first).toEqual([cards[0], cards[4], cards[1], cards[0]]);
  expect(await second).toEqual([cards[2], cards[3], cards[4], cards[5], cards[6], cards[7]]);
  expect(started).toEqual(['G0', 'G4', 'G1', 'G2', 'G3', 'G5', 'G6', 'G7']);
  await catalog.loadCards(cards.map(card => card.id));
  expect(fetchMock).toHaveBeenCalledTimes(10); // manifest/index + eight unique groups
});

it('keeps successful queued groups after one failure and retries only the failed group without partial results', async () => {
  const cards = Array.from({ length: 6 }, (_, i) => card(`G${i}-001`));
  const { fetchMock, routes, manifest } = fixture(cards);
  const catalog = await openGeneratedCardCatalog('/catalog');
  const gates = Object.fromEntries(cards.map((_card, i) => [`G${i}`, deferred()]));
  const started: string[] = [];
  fetchMock.mockImplementation(async path => {
    const group = path.split('/').pop()!.replace('.json', '');
    const repeated = started.includes(group);
    started.push(group);
    return repeated ? new Response(routes.get(path)) : gates[group].promise;
  });
  const outcome = catalog.loadCards(cards.map(card => card.id)).then(() => 'unexpected success', error => error);
  expect(started).toEqual(['G0', 'G1', 'G2', 'G3']);
  for (const group of ['G0', 'G1', 'G2', 'G3']) gates[group].resolve(new Response(routes.get(`/catalog/${manifest.details[group].file}`)));
  await vi.waitFor(() => expect(started).toHaveLength(6));
  gates.G4.resolve(new Response('missing', { status: 404 }));
  expect((await outcome).message).toContain('404');
  gates.G5.resolve(new Response(routes.get(`/catalog/${manifest.details.G5.file}`)));
  await catalog.loadCards([cards[5].id]);
  expect(await catalog.loadCards(cards.map(card => card.id))).toEqual(cards);
  expect(started).toEqual(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G4']);
});

it('aborts a stalled detail response body after its deadline and permits a same-version retry', async () => {
  const { fetchMock, routes } = fixture();
  const catalog = await openGeneratedCardCatalog('/catalog');
  vi.useFakeTimers();
  try {
    let attempts = 0;
    let stalledSignal: AbortSignal | undefined;
    fetchMock.mockImplementation(async (path, options) => {
      if (path.endsWith('/BP01.json') && attempts++ === 0) {
        stalledSignal = options?.signal ?? undefined;
        return new Response(new ReadableStream<Uint8Array>({ start(controller) {
          options?.signal?.addEventListener('abort', () => controller.error(new Error('aborted response body')), { once: true });
        } }));
      }
      return new Response(routes.get(path));
    });
    const outcome = catalog.loadCards(['BP01-001']).then(() => 'unexpected success', error => error);
    expect(await catalog.loadCards(['TK01-001'])).toEqual([fullCards()[2]]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(stalledSignal?.aborted).toBe(true);
    expect((await outcome).message).toMatch(/timed out/);
    expect(await catalog.loadCards(['BP01-001'])).toEqual([fullCards()[0]]);
    await catalog.loadCards(['BP01-001', 'TK01-001']);
    expect(fetchMock).toHaveBeenCalledTimes(5); // manifest/index, stalled group, successful group, retry
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});

// Compare the actual validators to catch differences in known fields, enum
// values, optional values and recursive faces before artifacts are published.
it('keeps Python source validation aligned with the Reader field contract', async () => {
  const fields: Record<string, unknown>[] = [
    {}, { extension: { zero: 0, flag: false, missing: null } },
    ...['image', 'title', 'type', 'subtype', 'rarity', 'product_name', 'cost', 'atk', 'hp', 'ability_text']
      .flatMap(key => ['', '0', 1, null, false, [], {}].map(value => ({ [key]: value }))),
    ...['is_token', 'is_evolve_card', 'is_deck_build_legal']
      .flatMap(key => [true, false, 0, 1, 'false', null].map(value => ({ [key]: value }))),
    ...Object.entries({ class: [...CLASS_VALUES, '-'], card_kind_normalized: CARD_KIND_NORMALIZED_VALUES,
      deck_section: DECK_SECTION_VALUES, catalog_status: ['released'] })
      .flatMap(([key, allowed]) => [...allowed, 'unknown', null, [], {}].map(value => ({ [key]: value }))),
    { related_cards: [] }, { related_cards: [{ id: 'A-1', name: '' }] },
    { related_cards: [{ id: 'A-1' }] }, { related_cards: [{ id: 'A-1', name: 1 }] },
    { related_cards: null }, { faces: [] }, { faces: null }, { faces: [null] },
    { faces: [{ name: 'Back' }] }, { faces: [{ side: 1 }] },
    { faces: [{ side: '', id: null }] }, { faces: [{ side: 'back', name: null }] },
    ...[{ cost: 1 }, { ability_text: 123 }, { is_token: 0 }, { class: 'unknown' },
      { catalog_status: 'preview' }, { related_cards: [{ id: 'A-1' }] },
      { faces: [{ side: 'front', hp: 1 }] }].map(extra => ({ faces: [{ side: 'back', ...extra }] })),
  ];
  const cards = fields.map(extra => card('A-1', extra));
  const accepted: boolean[] = JSON.parse(execFileSync('python3', ['-c', [
    'import json, sys',
    'from tools.card_data.generate_catalog import validate_cards',
    'results = []',
    'for card in json.load(sys.stdin):',
    '    try:',
    '        validate_cards([card], "parity")',
    '        results.append(True)',
    '    except ValueError:',
    '        results.append(False)',
    'print(json.dumps(results))',
  ].join('\n')], { input: JSON.stringify(cards), encoding: 'utf8' }));
  expect(accepted).toHaveLength(cards.length);
  for (const [position, entry] of cards.entries()) {
    fixture([entry]);
    let readerAccepted = false;
    try {
      const catalog = await openGeneratedCardCatalog('/catalog');
      await catalog.loadCards(['A-1']);
      readerAccepted = true;
    } catch (error) {
      expect(String(error)).toContain('Invalid generated card catalog:');
    }
    expect(accepted[position], JSON.stringify(fields[position])).toBe(readerAccepted);
  }
});
