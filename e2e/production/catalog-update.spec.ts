import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { cardCatalog } from '../../build/cardCatalog';

// Two actual builds, served through a switched static origin. Application card
// sources and the normal dist/ directory are never modified by this fixture.
test('a removed catalog version rejects without mixing data and a page reload loads the current version', async ({ page }) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-update-')));
  const prefix = '/catalog-update-fixture/';
  try {
    mkdirSync(join(root, 'public'));
    writeFileSync(join(root, 'public/cards_preview.json'), '[]');
    writeFileSync(join(root, 'index.html'), '<html><body><script type="module" src="/fixture.js"></script></body></html>');
    const reader = resolve('src/utils/card/generatedCardCatalog.ts');
    writeFileSync(join(root, 'fixture.js'), `
      import { openGeneratedCardCatalog } from ${JSON.stringify(reader)};
      window.openCatalog = () => openGeneratedCardCatalog('${prefix}card-catalog');
      window.openCatalog().then(catalog => { window.catalog = catalog; });
    `);
    const outputs = [];
    const versions: string[] = [];
    for (const name of ['Old card', 'Updated card']) {
      writeFileSync(join(root, 'public/cards_detailed.json'), JSON.stringify([
        { id: 'BP01-001', name, ability_text: `${name} details`, cost: '1' },
      ]));
      const outDir = join(root, `build-${outputs.length}`);
      await build({ configFile: false, root, base: prefix, logLevel: 'silent',
        plugins: [cardCatalog()], build: { outDir, minify: false } });
      outputs.push(outDir);
      versions.push(JSON.parse(readFileSync(join(outDir, 'card-catalog/manifest.json'), 'utf8')).catalogVersion);
    }
    expect(versions[0]).not.toBe(versions[1]);
    let deployed = outputs[0];
    const detailsRequested: string[] = [];
    await page.route(`**${prefix}**`, async route => {
      const pathname = new URL(route.request().url()).pathname;
      const relative = pathname.slice(prefix.length);
      if (relative.includes('/details/')) detailsRequested.push(relative);
      const file = join(deployed, relative);
      if (!existsSync(file)) return route.fulfill({ status: 404, body: 'Not found' });
      await route.fulfill({ contentType: file.endsWith('.js') ? 'text/javascript'
        : file.endsWith('.json') ? 'application/json' : 'text/html', body: readFileSync(file) });
    });
    await page.goto(`${prefix}index.html`);
    await page.waitForFunction(() => Reflect.get(window, 'catalog') !== undefined);
    expect(await page.evaluate(() => Reflect.get(window, 'catalog').version)).toBe(versions[0]);
    expect(detailsRequested).toEqual([]);
    deployed = outputs[1];
    const failed = await page.evaluate(async () => {
      try {
        await Reflect.get(window, 'catalog').loadCards(['BP01-001']);
        return { rejected: false, message: '' };
      } catch (error) {
        return { rejected: true, message: String(error) };
      }
    });
    expect(failed.rejected).toBe(true);
    expect(failed.message).toContain('404');
    expect(await page.evaluate(() => Reflect.get(window, 'catalog').version)).toBe(versions[0]);
    expect(detailsRequested).toEqual([`card-catalog/versions/${versions[0]}/details/BP01.json`]);
    await page.reload();
    await page.waitForFunction(() => Reflect.get(window, 'catalog') !== undefined);
    const updated = await page.evaluate(async () => {
      const catalog = Reflect.get(window, 'catalog');
      return { version: catalog.version, cards: await catalog.loadCards(['BP01-001']) };
    });
    expect(updated.version).toBe(versions[1]);
    expect(updated.cards).toEqual([{ id: 'BP01-001', name: 'Updated card', ability_text: 'Updated card details', cost: '1', catalog_status: 'released' }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
