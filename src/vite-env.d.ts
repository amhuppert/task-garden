/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLAN_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
