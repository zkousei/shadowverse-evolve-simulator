declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_CARD_ART_MODE?: 'official' | 'dummy'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
