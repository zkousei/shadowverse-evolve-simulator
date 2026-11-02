import { execFileSync } from 'node:child_process';

type VersionEnvironment = {
  VERCEL_GIT_COMMIT_SHA?: string;
  APP_VERSION?: string;
};

const shortSha = (value: string | undefined): string | undefined => {
  const sha = value?.trim();
  return sha && /^[a-f0-9]{7,40}$/i.test(sha) ? sha.slice(0, 7).toLowerCase() : undefined;
};

export const getAppVersion = (
  release: string,
  env: VersionEnvironment,
  readCommit = () => execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }),
): { release: string; buildId: string } => {
  let buildId = shortSha(env.VERCEL_GIT_COMMIT_SHA);
  if (!buildId) {
    try {
      buildId = shortSha(readCommit());
    } catch {
      // Source archives can be built without a Git checkout.
    }
  }
  return { release, buildId: buildId ?? 'unknown' };
};
