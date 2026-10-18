import { expect, test } from '@playwright/test';
import { buildGeneratedCatalogFixture } from '../helpers/generatedCatalog';

test.use({ locale: 'en-US' });

test('production deck builder limits detail downloads while preserving a complete visible page', async ({ page }) => {
  const cards = Array.from({ length: 8 }, (_, i) => ({
    id: `G${i}-001`, name: `Card ${i}`, image: '', class: 'ロイヤル', type: 'フォロワー',
    cost: '1', atk: '2', hp: '2', ability_text: `Ability ${i}`, deck_section: 'main',
    card_kind_normalized: 'follower', is_deck_build_legal: true,
  }));
  const fixture = buildGeneratedCatalogFixture(cards);
  const releases = new Map<string, () => void>();
  const gates = new Map(cards.map((_card, i) => [`G${i}`, new Promise<void>(resolve => releases.set(`G${i}`, resolve))]));
  const started: string[] = [];
  const errors: string[] = [];
  let active = 0;
  let peak = 0;
  let released = false;
  const releaseAll = () => { released = true; releases.forEach(release => release()); };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/card-catalog/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const group = path.match(/\/details\/(G\d)\.json$/)?.[1];
    if (group) {
      started.push(group);
      active++;
      peak = Math.max(peak, active);
    }
    try {
      if (group && !released) await gates.get(group);
      const body = fixture.files.get(path);
      await route.fulfill({ status: body ? 200 : 404, contentType: 'application/json', body: body ?? '{}' });
    } finally { if (group) active--; }
  });
  try {
    await page.goto('/deck-builder');
    await expect.poll(() => started.length).toBe(4);
    expect(started).toEqual(['G0', 'G1', 'G2', 'G3']);
    releases.get('G0')!();
    await expect.poll(() => started.length).toBe(5);
    expect(started[4]).toBe('G4');
    expect(peak).toBeLessThanOrEqual(4);
    releaseAll();
    await expect(page.getByRole('button', { name: 'Preview Card 0', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Preview Card \d$/ })).toHaveCount(8);
    expect(started).toEqual(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']);
    expect(peak).toBe(4);
    expect(active).toBe(0);
    expect(errors).toEqual([]);
  } finally { releaseAll(); }
});
