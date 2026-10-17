import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ResolvedConfig } from 'vite';

const repository = fileURLToPath(new URL('../', import.meta.url));
const prefix = '/card-catalog';
const versionFile = /^\/card-catalog\/versions\/[a-f0-9]{64}\/(?:index\.json|details\/[A-Za-z0-9_]+\.json)$/;

/** Build-only assets: never generated into public/, and never imported by the app. */
export const cardCatalog = (): Plugin => {
  let config: ResolvedConfig;
  return {
    name: 'verified-card-catalog',
    apply: (_config, environment) => environment.command === 'build' || environment.isPreview === true,
    configResolved(value) { config = value; },
    buildStart() {
      if (!config.publicDir) throw new Error('Card catalog requires a public directory');
      if (existsSync(join(config.publicDir, 'card-catalog'))) {
        throw new Error('public/card-catalog is reserved for verified build output');
      }
      // Each build starts from a private empty directory. No local artifacts or
      // previous deployments can silently supply stale data to this build.
      const temporary = mkdtempSync(join(tmpdir(), 'catalog-build-'));
      try {
        const args = ['-m', 'tools.card_data.catalog_history', 'stage',
          '--released', join(config.publicDir, 'cards_detailed.json'),
          '--preview', join(config.publicDir, 'cards_preview.json'),
          '--history', join(config.root, 'card-catalog-history'),
          '--output', temporary];
        const run = (extra: string[] = []) => {
          try {
            return execFileSync('python3', [...args, ...extra], {
              cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
            });
          } catch (error) {
            const failure = error as Error & { stderr?: string };
            throw new Error(`Card catalog build failed (Python 3 required): ${failure.stderr || failure.message}`);
          }
        };
        run();
        const checked = JSON.parse(run(['--check'])) as { files: string[] };
        // Read every verified current/retained file before emitting any assets.
        const files = checked.files.map(name => {
          if (!/^(?:manifest\.json|versions\/[a-f0-9]{64}\/(?:index\.json|details\/[A-Za-z0-9_]+\.json))$/.test(name)) {
            throw new Error('Unsafe staged card catalog path');
          }
          return { name, source: readFileSync(join(temporary, name)) };
        });
        for (const file of files) this.emitFile({
          type: 'asset', fileName: `card-catalog/${file.name}`, source: file.source,
        });
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    },
    configurePreviewServer(server) {
      // Match the production hosting contract: missing JSON must not become a
      // successful SPA response. This middleware only owns the catalog prefix.
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return next();
        const manifest = pathname === `${prefix}/manifest.json`;
        const allowed = manifest || versionFile.test(pathname);
        const file = resolve(config.root, config.build.outDir, `.${pathname}`);
        if (!allowed || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(req.method === 'HEAD' ? undefined : '{"error":"Catalog file not found"}');
          return;
        }
        // Keep all catalog responses revalidated until hosting retention and
        // missing-version cache behavior have been verified on Vercel.
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        next();
      });
    },
  };
};
