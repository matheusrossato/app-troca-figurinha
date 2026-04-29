/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  readonly VITE_CLIENT_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
