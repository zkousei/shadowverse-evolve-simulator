import { afterEach, expect, test, vi } from 'vitest';
import { resolveConfig } from 'vite';
import { resolve } from 'node:path';
import { deploymentAssetBase } from './deploymentAssetBase';

test('pins Vercel build assets to the unique deployment hostname', () => {
  expect(deploymentAssetBase('build', { VERCEL: '1', VERCEL_URL: 'example-abc123-team.vercel.app' }))
    .toBe('https://example-abc123-team.vercel.app/');
});

test('keeps local builds and development on the local origin', () => {
  expect(deploymentAssetBase('build', {})).toBe('/');
  expect(deploymentAssetBase('build', { VERCEL_URL: 'example.vercel.app' })).toBe('/');
  expect(deploymentAssetBase('serve', { VERCEL: '1', VERCEL_URL: 'example.vercel.app' })).toBe('/');
});

test('rejects missing or unsafe deployment hosts instead of emitting broken URLs', () => {
  for (const VERCEL_URL of [undefined, '', 'https://example.vercel.app', 'example.vercel.app/path',
    'example.vercel.app.evil.test', 'example.vercel.app:443', 'user@example.vercel.app', '-bad.vercel.app']) {
    expect(() => deploymentAssetBase('build', { VERCEL: '1', VERCEL_URL })).toThrow(/VERCEL_URL/);
  }
});


afterEach(() => vi.unstubAllEnvs());

test('the real Vite config pins only production builds, not the dev server', async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('VERCEL_URL', 'config-fixture.vercel.app');
  const options = { configFile: resolve('vite.config.ts'), logLevel: 'silent' as const };
  expect((await resolveConfig(options, 'build')).base).toBe('https://config-fixture.vercel.app/');
  expect((await resolveConfig(options, 'serve')).base).toBe('/');
});
