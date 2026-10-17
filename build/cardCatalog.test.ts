import { afterEach, expect, test } from 'vitest';
import { build, resolveConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cardCatalog } from './cardCatalog';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
const retain = (root: string) => JSON.parse(execFileSync('python3', [
  '-m', 'tools.card_data.catalog_history', 'retain',
  '--released', join(root, 'public/cards_detailed.json'),
  '--preview', join(root, 'public/cards_preview.json'),
  '--history', join(root, 'card-catalog-history'),
], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' })).catalogVersion as string;
const fixture = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-build-test-')));
  roots.push(root);
  mkdirSync(join(root, 'public'));
  writeFileSync(join(root, 'index.html'), '<html><body>unchanged app</body></html>');
  writeFileSync(join(root, 'public/cards_detailed.json'), JSON.stringify([
    { id: 'BP01-001', name: 'Test', ability_text: 'Full details', future: { value: 0 } },
  ]));
  writeFileSync(join(root, 'public/cards_preview.json'), '[]');
  retain(root);
  return root;
};
const compile = (root: string, write = false) => build({
  configFile: false, root, plugins: [cardCatalog()], logLevel: 'silent',
  build: { write, minify: false },
});

test('emits freshly verified manifest, index and full details without modifying inputs', async () => {
  const root = fixture();
  const before = readFileSync(join(root, 'public/cards_detailed.json'), 'utf8');
  const result = await compile(root);
  if (Array.isArray(result) || !('output' in result)) throw new Error('Expected one output bundle');
  const assets = new Map(result.output.filter(file => file.type === 'asset').map(file => [file.fileName, String(file.source)]));
  const manifest = JSON.parse(assets.get('card-catalog/manifest.json')!);
  expect(manifest.counts.total).toBe(1);
  expect(JSON.parse(assets.get(`card-catalog/${manifest.index.file}`)!)[0].ability_text).toBeUndefined();
  expect(JSON.parse(assets.get(`card-catalog/${manifest.details.BP01.file}`)!)[0]).toMatchObject({
    ability_text: 'Full details', future: { value: 0 },
  });
  expect([...assets.keys()].filter(name => name.startsWith('card-catalog/'))).toHaveLength(3);
  expect(readFileSync(join(root, 'public/cards_detailed.json'), 'utf8')).toBe(before);
});

test('fails the build on invalid source data instead of publishing an incomplete catalog', async () => {
  const root = fixture();
  writeFileSync(join(root, 'public/cards_preview.json'), '[{"id":"PV01-001","name":"Preview","related_cards":[{"id":"MISSING-1"}]}]');
  await expect(compile(root)).rejects.toThrow(/unresolved related card/);
});

test('fails the build on missing input rather than reusing previous artifacts', async () => {
  const root = fixture();
  rmSync(join(root, 'public/cards_preview.json'));
  await expect(compile(root)).rejects.toThrow(/cards_preview.json/);
});

test('refuses a public catalog directory that could overwrite the verified output', async () => {
  const root = fixture();
  mkdirSync(join(root, 'public/card-catalog'));
  writeFileSync(join(root, 'public/card-catalog/manifest.json'), 'stale');
  await expect(compile(root)).rejects.toThrow(/reserved/);
});

test('rebuilds from changed inputs and includes exactly the recorded versions', async () => {
  const root = fixture();
  const versions = [];
  for (const id of ['BP01-001', 'BP02-002']) {
    writeFileSync(join(root, 'public/cards_detailed.json'), JSON.stringify([{ id, name: 'Test' }]));
    retain(root);
    const result = await compile(root);
    if (Array.isArray(result) || !('output' in result)) throw new Error('Expected output bundle');
    const manifest = result.output.find(file => file.fileName === 'card-catalog/manifest.json');
    if (!manifest || manifest.type !== 'asset') throw new Error('Expected manifest');
    const parsed = JSON.parse(String(manifest.source));
    versions.push(parsed.catalogVersion);
    expect(Object.keys(parsed.details)).toEqual([id.split('-')[0]]);
    expect(result.output.filter(file => file.fileName.startsWith('card-catalog/'))).toHaveLength(3 + 2 * versions.length);
  }
  expect(versions[0]).not.toBe(versions[1]);
});


test('a failed catalog build leaves the previous output untouched', async () => {
  const root = fixture();
  mkdirSync(join(root, 'dist'));
  writeFileSync(join(root, 'dist/index.html'), 'previous complete deployment');
  writeFileSync(join(root, 'public/cards_preview.json'), 'not JSON');
  await expect(compile(root, true)).rejects.toThrow(/Invalid catalog JSON/);
  expect(readFileSync(join(root, 'dist/index.html'), 'utf8')).toBe('previous complete deployment');
});

test('does not activate for development but does activate for production preview', async () => {
  const root = fixture();
  const options = { configFile: false as const, root, plugins: [cardCatalog()], logLevel: 'silent' as const };
  const dev = await resolveConfig(options, 'serve');
  expect(dev.plugins.some(plugin => plugin.name === 'verified-card-catalog')).toBe(false);
  const preview = await resolveConfig(options, 'serve', 'production', 'production', true);
  expect(preview.plugins.some(plugin => plugin.name === 'verified-card-catalog')).toBe(true);
});


test('publishes old versions after a data update and refuses an unrecorded current version', async () => {
  const root = fixture();
  const oldVersion = retain(root);
  writeFileSync(join(root, 'public/cards_detailed.json'), JSON.stringify([{ id: 'BP02-001', name: 'New' }]));
  await expect(compile(root)).rejects.toThrow(/not retained/);
  const currentVersion = retain(root);
  const result = await compile(root);
  if (Array.isArray(result) || !('output' in result)) throw new Error('Expected bundle');
  const assets = new Map(result.output.filter(file => file.type === 'asset').map(file => [file.fileName, String(file.source)]));
  expect(JSON.parse(assets.get('card-catalog/manifest.json')!).catalogVersion).toBe(currentVersion);
  expect(JSON.parse(assets.get(`card-catalog/versions/${oldVersion}/details/BP01.json`)!)[0])
    .toMatchObject({ name: 'Test', ability_text: 'Full details', future: { value: 0 } });
  expect(JSON.parse(assets.get(`card-catalog/versions/${currentVersion}/details/BP02.json`)!)[0]).toMatchObject({ name: 'New' });
});
