/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_TILE_PROVIDER?: string;
  readonly VITE_TILE_API_KEY?: string;
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
}
