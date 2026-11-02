import { afterEach, expect, test, vi } from 'vitest';
import { resolveConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { getAppVersion } from './appVersion';

const sha = 'abcdef1234567890abcdef1234567890abcdef12';

afterEach(() => vi.unstubAllEnvs());

test('uses package release and Vercel commit even with an old APP_VERSION', () => {
  const readCommit = vi.fn(() => '1234567');
  expect(getAppVersion('1.0.1', { VERCEL_GIT_COMMIT_SHA: sha, APP_VERSION: 'v0.0.4' }, readCommit))
    .toEqual({ release: '1.0.1', buildId: 'abcdef1' });
  expect(readCommit).not.toHaveBeenCalled();
});

test('uses local Git when Vercel metadata is absent or invalid', () => {
  for (const value of [undefined, '', '  ', 'invalid', '<script>']) {
    expect(getAppVersion('1.0.1', { VERCEL_GIT_COMMIT_SHA: value }, () => sha))
      .toEqual({ release: '1.0.1', buildId: 'abcdef1' });
  }
});

test('handles unavailable or invalid local Git metadata', () => {
  expect(getAppVersion('1.0.1', {}, () => { throw new Error('no git'); }))
    .toEqual({ release: '1.0.1', buildId: 'unknown' });
  expect(getAppVersion('1.0.1', {}, () => 'invalid')).toEqual({ release: '1.0.1', buildId: 'unknown' });
});

test('new commits change build identity and rebuilding the same commit is stable', () => {
  const first = getAppVersion('1.0.1', { VERCEL_GIT_COMMIT_SHA: sha });
  expect(getAppVersion('1.0.1', { VERCEL_GIT_COMMIT_SHA: sha })).toEqual(first);
  expect(getAppVersion('1.0.1', { VERCEL_GIT_COMMIT_SHA: '1234567abcdef' }).buildId).not.toBe(first.buildId);
});

test('the real Vite config exposes package release and commit separately', async () => {
  vi.stubEnv('APP_VERSION', 'v0.0.4');
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', sha);
  const config = await resolveConfig({ configFile: resolve('vite.config.ts'), logLevel: 'silent' }, 'build');
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const lockfile = JSON.parse(readFileSync(resolve('package-lock.json'), 'utf8'));
  expect(config.define?.__APP_VERSION__).toBe(JSON.stringify(packageJson.version));
  expect(lockfile.version).toBe(packageJson.version);
  expect(lockfile.packages[''].version).toBe(packageJson.version);
  expect(config.define?.__APP_BUILD_ID__).toBe(JSON.stringify('abcdef1'));
});
