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
})
