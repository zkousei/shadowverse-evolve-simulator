import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('excludes asset, catalog and API requests from SPA fallback', () => {
  const fallback = new RegExp(`^${config.rewrites[0].source}$`);
  for (const path of ['/card-catalog', '/card-catalog/', '/card-catalog/missing.json', '/assets', '/assets/missing.js', '/api/decklog/view/123']) {
    expect(fallback.test(path), path).toBe(false);
  }
  for (const path of ['/', '/deck-builder', '/game', '/card-catalogue', '/assets-guide', '/other-page']) {
    expect(fallback.test(path), path).toBe(true);
  }
  expect(config.rewrites[0].destination).toBe('/index.html');
});

test('revalidates both manifest and versioned files until deployment retention is verified', () => {
  expect(config.headers).toEqual(expect.arrayContaining([
    { source: '/card-catalog/manifest.json', headers: [
      { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
    ] },
    { source: '/card-catalog/versions/:version/:path*', headers: [
      { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
    ] },
  ]));
});
