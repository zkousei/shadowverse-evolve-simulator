declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly PROD: boolean
  readonly VITE_CARD_ART_MODE?: 'official' | 'dummy'
  readonly VITE_ENABLE_VERCEL_ANALYTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
