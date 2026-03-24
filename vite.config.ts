import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

const getAppVersion = () => {
  const envVersion = process.env.APP_VERSION?.trim()
  if (envVersion) {
    return envVersion
  }

  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return getPackageVersion()
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  server: {
    proxy: {
      '/api/decklog/view': {
        target: 'https://decklog.bushiroad.com',
        changeOrigin: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://decklog.bushiroad.com',
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
})
