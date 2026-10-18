import type { DeckBuilderCardData } from '../../models/deckBuilderCard';
import { CARD_KIND_NORMALIZED_VALUES, DECK_SECTION_VALUES } from '../../models/cardClassification';
import { CLASS_VALUES } from '../../models/class';
import { createCatalogDetailQueue } from './catalogDetailQueue';
import { CARD_INDEX_FIELDS as INDEX_FIELDS, decodeGeneratedCardIndex } from './generatedCardIndex';

type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
// A compile-time certificate prevents a summary from being passed as full data.
// This adds no field to JSON or persisted cards. Generated images may be absent.
declare const verifiedDetails: unique symbol;
export type GeneratedCardDetails = Immutable<Omit<DeckBuilderCardData, 'image'> & { image?: string }> & { readonly [verifiedDetails]: true };
export type GeneratedCardIndexEntry = Readonly<Pick<GeneratedCardDetails, typeof INDEX_FIELDS[number]> & { detail_group: string }>;
export interface GeneratedCardCatalog {
  readonly version: string;
  readonly index: readonly GeneratedCardIndexEntry[];
  loadCards(ids: readonly string[]): Promise<readonly GeneratedCardDetails[]>;
  loadCardsWithRelated(ids: readonly string[]): Promise<readonly GeneratedCardDetails[]>;
}

type JsonObject = Record<string, unknown>;
type Descriptor = { file: string; sha256: string; count: number; bytes: number };
type Manifest = {
  schemaVersion: number;
  catalogVersion: string;
  index: Descriptor;
  details: Record<string, Descriptor>;
  counts: { released: number; preview: number; total: number };
};
const HASH = /^[a-f0-9]{64}$/;
const GROUP = /^[A-Za-z0-9_]+$/;
const fail = (message: string): never => { throw new Error(`Invalid generated card catalog: ${message}`); };
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('expected object');
  return value as JsonObject;
};
const count = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return fail('invalid count or size');
  return value;
};
const groupFor = (id: string) => id.split('-')[0];
const digest = async (buffer: ArrayBuffer): Promise<string> => {
  const hashed = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashed), byte => byte.toString(16).padStart(2, '0')).join('');
};
// Canonical comparison ignores object key order but preserves arrays and all values.
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const freeze = <T,>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const fetchResponse = async (path: string, fresh = false, signal?: AbortSignal) => {
  const options: RequestInit | undefined = fresh ? { cache: 'no-cache', ...(signal ? { signal } : {}) } : signal ? { signal } : undefined;
  const response = options ? await fetch(path, options) : await fetch(path);
  if (!response.ok) throw new Error(`Card catalog request failed (${response.status}): ${path}`);
  return response;
};
const descriptor = (value: unknown, file: string): Descriptor => {
  const entry = object(value);
  if (entry.file !== file || typeof entry.sha256 !== 'string' || !HASH.test(entry.sha256)) return fail('invalid file reference');
  count(entry.gzipBytes);
  return { file, sha256: entry.sha256, bytes: count(entry.bytes), count: count(entry.count) };
};
const parseManifest = async (value: unknown): Promise<Manifest> => {
  const raw = object(value);
  if ((raw.schemaVersion !== 1 && raw.schemaVersion !== 2) || typeof raw.catalogVersion !== 'string' || !HASH.test(raw.catalogVersion)) return fail('unsupported version');
  const prefix = `versions/${raw.catalogVersion}/`;
  const index = descriptor(raw.index, `${prefix}index.json`);
  const details = Object.fromEntries(Object.entries(object(raw.details)).map(([group, entry]) => {
    if (!GROUP.test(group)) return fail('unsafe group');
    return [group, descriptor(entry, `${prefix}details/${group}.json`)];
  }));
  const rawCounts = object(raw.counts);
  const counts = { released: count(rawCounts.released), preview: count(rawCounts.preview), total: count(rawCounts.total) };
  if (counts.released + counts.preview !== counts.total || index.count !== counts.total ||
      Object.values(details).reduce((sum, entry) => sum + entry.count, 0) !== counts.total) return fail('inconsistent counts');
  const files = { 'index.json': index.sha256, ...Object.fromEntries(Object.entries(details).map(([group, entry]) => [`details/${group}.json`, entry.sha256])) };
  const version = await digest(new TextEncoder().encode(canonical({ schemaVersion: raw.schemaVersion, files }) + '\n').buffer);
  if (version !== raw.catalogVersion) return fail('version does not match file hashes');
  return { schemaVersion: raw.schemaVersion, catalogVersion: version, index, details, counts };
};
const readFile = async (base: string, entry: Descriptor, signal?: AbortSignal): Promise<unknown> => {
  const response = await fetchResponse(`${base}/${entry.file}`, false, signal);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== entry.bytes || await digest(bytes) !== entry.sha256) return fail('file size or checksum mismatch');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
};
const validateCard = (value: unknown): JsonObject => {
  const entry = object(value);
  if (typeof entry.id !== 'string' || !entry.id.trim() || !GROUP.test(groupFor(entry.id)) ||
      typeof entry.name !== 'string' || !entry.name.trim()) return fail('invalid card identity');
  for (const key of ['image', 'title', 'type', 'subtype', 'rarity', 'product_name', 'cost', 'atk', 'hp', 'ability_text']) {
    if (key in entry && typeof entry[key] !== 'string') return fail(`invalid card field ${key}`);
  }
  for (const key of ['is_token', 'is_evolve_card', 'is_deck_build_legal']) {
    if (key in entry && typeof entry[key] !== 'boolean') return fail(`invalid card field ${key}`);
  }
  for (const [key, allowed] of [
    ['class', [...CLASS_VALUES, '-']], ['card_kind_normalized', CARD_KIND_NORMALIZED_VALUES],
    ['deck_section', DECK_SECTION_VALUES], ['catalog_status', ['released', 'preview']],
  ] as const) {
    if (key in entry && !(allowed as readonly unknown[]).includes(entry[key])) return fail(`invalid card field ${key}`);
  }
  if ('related_cards' in entry) {
    if (!Array.isArray(entry.related_cards)) return fail('invalid related cards');
    for (const ref of entry.related_cards) {
      const related = object(ref);
      if (typeof related.id !== 'string' || !related.id || typeof related.name !== 'string') return fail('invalid related reference');
    }
  }
  if ('faces' in entry) {
    if (!Array.isArray(entry.faces)) return fail('invalid faces');
    for (const face of entry.faces) {
      const data = object(face);
      if (typeof data.side !== 'string') return fail('invalid face side');
      validateCard({ ...data, id: entry.id, name: 'name' in data ? data.name : entry.name });
    }
  }
  return entry;
};
const project = (entry: JsonObject): JsonObject => Object.fromEntries([
  ...INDEX_FIELDS.filter(key => key in entry).map(key => [key, entry[key]]),
  ['detail_group', groupFor(entry.id as string)],
]);

/** Opens one immutable version. Nothing is installed into existing app state. */
export const openGeneratedCardCatalog = async (basePath: string): Promise<GeneratedCardCatalog> => {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\/?$/.test(basePath)) return fail('unsafe base path');
  const base = basePath.replace(/\/$/, '');
  const manifest = await parseManifest(await (await fetchResponse(`${base}/manifest.json`, true)).json());
  const rawIndex = decodeGeneratedCardIndex(await readFile(base, manifest.index), manifest.schemaVersion);
  if (!Array.isArray(rawIndex) || rawIndex.length !== manifest.index.count) return fail('invalid index count');
  const byId = new Map<string, GeneratedCardIndexEntry>();
  const groupEntries = new Map<string, GeneratedCardIndexEntry[]>();
  let released = 0;
  const index = rawIndex.map(value => {
    const entry = validateCard(value);
    const id = entry.id as string;
    const group = groupFor(id);
    if (byId.has(id) || !Object.hasOwn(manifest.details, group) || canonical(entry) !== canonical(project(entry))) return fail('invalid index projection or duplicate ID');
    if (entry.catalog_status === 'released') released++;
    else if (entry.catalog_status !== 'preview') return fail('missing catalog status');
    const summary = freeze(entry) as GeneratedCardIndexEntry;
    byId.set(id, summary);
    const entries = groupEntries.get(group) ?? [];
    entries.push(summary);
    groupEntries.set(group, entries);
    return summary;
  });
  if (released !== manifest.counts.released) return fail('released count mismatch');
  for (const entry of index) {
    if (entry.related_cards?.some(ref => !byId.has(ref.id))) return fail('unresolved related card');
  }
  for (const [group, entry] of Object.entries(manifest.details)) {
    if (!entry.count || groupEntries.get(group)?.length !== entry.count) return fail('group count mismatch');
  }
  const groups = new Map<string, Promise<ReadonlyMap<string, GeneratedCardDetails>>>();
  const enqueueDetail = createCatalogDetailQueue();
  const loadGroup = (group: string): Promise<ReadonlyMap<string, GeneratedCardDetails>> => {
    const existing = groups.get(group);
    if (existing) return existing;
    const pending = enqueueDetail(async signal => {
      const raw = await readFile(base, manifest.details[group], signal);
      const expected = groupEntries.get(group)!;
      if (!Array.isArray(raw) || raw.length !== expected.length) return fail('detail count mismatch');
      const result = new Map<string, GeneratedCardDetails>();
      for (const value of raw) {
        const entry = validateCard(value);
        const id = entry.id as string;
        if (result.has(id) || groupFor(id) !== group || !byId.has(id) || canonical(project(entry)) !== canonical(byId.get(id))) return fail('detail does not match index');
        result.set(id, freeze(entry) as GeneratedCardDetails);
      }
      if (expected.some(entry => !result.has(entry.id))) return fail('missing detail card');
      return result;
    }).catch(error => {
      groups.delete(group); // Failed and unvalidated data never enters the completed cache.
      throw error;
    });
    groups.set(group, pending);
    return pending;
  };
  const loadCards = async (ids: readonly string[]): Promise<readonly GeneratedCardDetails[]> => {
    // Snapshot caller input before the first await; later mutation cannot change the operation.
    const requested = [...ids];
    const entries = requested.map(id => byId.get(id) ?? fail(`unknown card ID: ${id}`));
    const loaded = await Promise.all([...new Set(entries.map(entry => entry.detail_group))].map(async group => [group, await loadGroup(group)] as const));
    const details = new Map(loaded);
    return Object.freeze(entries.map(entry => details.get(entry.detail_group)!.get(entry.id)!));
  };
  const loadCardsWithRelated = async (ids: readonly string[]): Promise<readonly GeneratedCardDetails[]> => {
    const requested = [...new Set(ids)];
    const seen = new Set(requested);
    // The validated index contains the complete reference graph, including cross-group cycles.
    for (const id of requested) {
      const entry = byId.get(id) ?? fail(`unknown card ID: ${id}`);
      for (const ref of entry.related_cards ?? []) {
        if (!seen.has(ref.id)) { seen.add(ref.id); requested.push(ref.id); }
      }
    }
    return loadCards(requested);
  };
  return Object.freeze({ version: manifest.catalogVersion, index: Object.freeze(index), loadCards, loadCardsWithRelated });
};
