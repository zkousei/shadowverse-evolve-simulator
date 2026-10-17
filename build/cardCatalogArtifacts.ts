import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));

export const catalogSourcePaths = (publicDir: string | false): string[] => {
  if (!publicDir) throw new Error('Card catalog requires a public directory');
  if (existsSync(join(publicDir, 'card-catalog'))) {
    throw new Error('public/card-catalog is reserved for verified build output');
  }
  return [join(publicDir, 'cards_detailed.json'), join(publicDir, 'cards_preview.json')];
};

/** Both build and dev publish only a complete, independently checked snapshot. */
export const generateCardCatalogAssets = async (publicDir: string | false): Promise<Map<string, Buffer>> => {
  const [released, preview] = catalogSourcePaths(publicDir);
  const temporary = mkdtempSync(join(tmpdir(), 'catalog-build-'));
  try {
    const args = ['-m', 'tools.card_data.generate_catalog', '--released', released,
      '--preview', preview, '--output', temporary];
    const run = async (extra: string[] = []) => {
      try {
        await execute('python3', [...args, ...extra], { cwd: repository, encoding: 'utf8' });
      } catch (error) {
        const failure = error as Error & { stderr?: string };
        throw new Error(`Card catalog build failed (Python 3 required): ${failure.stderr || failure.message}`);
      }
    };
    await run();
    await run(['--check']);
    const manifest = readFileSync(join(temporary, 'manifest.json'));
    const data = JSON.parse(manifest.toString('utf8')) as {
      index: { file: string }; details: Record<string, { file: string }>;
    };
    // Only the current manifest and its referenced files can be published.
    // Read everything before returning; failure never publishes a partial set.
    return new Map([['manifest.json', manifest],
      ...[data.index, ...Object.values(data.details)].map(({ file }) =>
        [file, readFileSync(join(temporary, file))] as [string, Buffer])]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
};
