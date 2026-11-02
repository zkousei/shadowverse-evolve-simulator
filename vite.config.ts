import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cardCatalog } from './build/cardCatalog'
import { deploymentAssetBase } from './build/deploymentAssetBase'
import { getAppVersion } from './build/appVersion'

const getPackageVersion = () => {
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL('./package.json', import.meta.url), 'utf8')
    ) as { version?: string }

    return packageJson.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const version = getAppVersion(getPackageVersion(), process.env)

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: deploymentAssetBase(command, process.env),
  plugins: [react(), cardCatalog()],
  define: {
    __APP_VERSION__: JSON.stringify(version.release),
    __APP_BUILD_ID__: JSON.stringify(version.buildId),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/decklog/view': {
        target: 'https://decklog.bushiroad.com',
        changeOrigin: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://decklog.bushiroad.com',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        },
        rewrite: (path) => path.replace(/^\/api\/decklog\/view/, '/system/app/api/view'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const path = proxyReq.path ?? '';
            const deckCode = path.split('/').filter(Boolean).pop();
            if (deckCode) {
              proxyReq.setHeader('Referer', `https://decklog.bushiroad.com/view/${deckCode}`);
            }
          });
        },
      },
    },
  },
}))
