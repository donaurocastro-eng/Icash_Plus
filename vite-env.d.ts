// Removed reference to vite/client due to missing type definitions
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global define
declare const __API_KEY__: string;

// Extend NodeJS.ProcessEnv to include API_KEY
// This avoids "Cannot redeclare block-scoped variable 'process'" error
// while ensuring process.env.API_KEY is typed if @types/node is present.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
