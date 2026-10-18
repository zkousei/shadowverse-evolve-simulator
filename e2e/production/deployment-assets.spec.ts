import { expect, test } from '../helpers/test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { deploymentAssetBase } from '../../build/deploymentAssetBase';

test('an open page loads its original lazy chunk after the deployment alias changes without reloading', async ({ page }) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'deployment-assets-')));
  const origins = ['https://old-fixture.vercel.app', 'https://new-fixture.vercel.app'];
  try {
    writeFileSync(join(root, 'index.html'), '<html><body><input aria-label="Draft"><button>Open page</button><p id="page"></p><script type="module" src="/main.js"></script></body></html>');
    writeFileSync(join(root, 'main.js'), `
      document.querySelector('button').onclick = async () => {
        const page = await import('./page.js');
        document.querySelector('#page').textContent = page.name;
      };
      window.ready = true;
    `);
    const outputs = new Map<string, string>();
    for (const [index, origin] of origins.entries()) {
      writeFileSync(join(root, 'page.js'), `export const name = '${index === 0 ? 'Old page' : 'New page'}';`);
      const outDir = join(root, `build-${index}`);
      mkdirSync(outDir);
      await build({ configFile: false, root, logLevel: 'silent',
        base: deploymentAssetBase('build', { VERCEL: '1', VERCEL_URL: new URL(origin).hostname }),
        build: { outDir, minify: false } });
      outputs.set(origin, outDir);
    }
    let alias = origins[0];
    let documents = 0;
    const assetOrigins: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.isNavigationRequest()) documents += 1; });
    await page.route('**/deployment-assets-fixture/', route => route.fulfill({
      contentType: 'text/html', body: readFileSync(join(outputs.get(alias)!, 'index.html')),
    }));
    await page.route('**/assets/**', async route => {
      const url = new URL(route.request().url());
      const selected = outputs.get(url.origin) ?? outputs.get(alias)!;
      assetOrigins.push(url.origin);
      const file = join(selected, url.pathname);
      if (!existsSync(file)) return route.fulfill({ status: 404, body: 'Not found' });
      await route.fulfill({ contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(file) });
    });
    await page.goto('/deployment-assets-fixture/');
    await page.waitForFunction(() => Reflect.get(window, 'ready') === true);
    await page.getByRole('textbox', { name: 'Draft' }).fill('Keep my unsaved work');
    alias = origins[1];
    await page.getByRole('button', { name: 'Open page' }).click();
    await expect(page.locator('#page')).toHaveText('Old page');
    await expect(page.getByRole('textbox')).toHaveValue('Keep my unsaved work');
    expect(documents).toBe(1);
    expect(assetOrigins.length).toBeGreaterThanOrEqual(2);
    expect(new Set(assetOrigins)).toEqual(new Set([origins[0]]));
    expect(errors).toEqual([]);
  } finally {
    await page.unrouteAll({ behavior: 'wait' });
    rmSync(root, { recursive: true, force: true });
  }
});
