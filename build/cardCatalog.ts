import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { catalogSourcePaths, generateCardCatalogAssets } from './cardCatalogArtifacts';

const prefix = '/card-catalog';
const versionFile = /^\/card-catalog\/versions\/[a-f0-9]{64}\/(?:index\.json|details\/[A-Za-z0-9_]+(?:@(?:[0-9]{4}|[1-9][0-9]{4,}))?\.json)$/;

/** Verified assets: generated outside public/; existing app consumers stay unchanged. */
export const cardCatalog = (): Plugin => {
  let config: ResolvedConfig;
  return {
    name: 'verified-card-catalog',
    configResolved(value) { config = value; },
    async buildStart() {
      // Vite also runs buildStart during development. Generate lazily there so
      // ordinary app development does not require Python or catalog artifacts.
      if (config.command !== 'build') return;
      for (const [name, source] of await generateCardCatalogAssets(config.publicDir)) {
        this.emitFile({ type: 'asset', fileName: `card-catalog/${name}`, source });
      }
    },
    configureServer(server) {
      type Snapshot = { key: string; files: Map<string, Buffer> };
      let snapshot: Snapshot | undefined;
      let pending: Promise<Snapshot> | undefined;
      const sourceKey = async () => {
        const contents = await Promise.all(catalogSourcePaths(config.publicDir).map(path => readFile(path)));
        // Compare content, not timestamps: same-size edits and atomic file
        // replacements must invalidate the snapshot even without watcher events.
        return contents.map(bytes => createHash('sha256').update(bytes).digest('hex')).join(':');
      };
      const currentFiles = async (): Promise<Map<string, Buffer>> => {
        const key = await sourceKey();
        if (snapshot?.key === key) return snapshot.files;
        snapshot = undefined;
        if (!pending) {
          pending = (async () => {
            const files = await generateCardCatalogAssets(config.publicDir);
            if (await sourceKey() !== key) throw new Error('Card catalog sources changed during generation; retry');
            snapshot = { key, files };
            return snapshot;
          })().finally(() => { pending = undefined; });
        }
        const completed = await pending;
        // A request for changed sources may have joined an older generation.
        return completed.key === key ? completed.files : currentFiles();
      };
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return next();
        const errorResponse = (status: number, message: string) => {
          if (res.destroyed) return;
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: message }));
        };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.setHeader('Allow', 'GET, HEAD');
          return errorResponse(405, 'Method not allowed');
        }
        if (pathname !== `${prefix}/manifest.json` && !versionFile.test(pathname)) {
          return errorResponse(404, 'Catalog file not found');
        }
        void currentFiles().then(files => {
          if (res.destroyed) return;
          const bytes = files.get(pathname.slice(prefix.length + 1));
          if (!bytes) return errorResponse(404, 'Catalog file not found');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          res.setHeader('Content-Length', bytes.length);
          res.end(req.method === 'HEAD' ? undefined : bytes);
        }).catch(error => {
          // Do not return a previous snapshot, public file, or SPA HTML on failure.
          snapshot = undefined;
          server.config.logger.error(String(error));
          errorResponse(503, 'Card catalog generation failed; fix the source data and retry');
        });
      });
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
        // Revalidate catalog files on access. Old versions are not retained,
        // and missing files must remain retryable after a page reload.
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        next();
      });
    },
  };
};
