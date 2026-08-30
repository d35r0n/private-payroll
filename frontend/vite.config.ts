import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'path';

export default defineConfig({
  cacheDir: './.vite',
  build: {
    target: 'esnext',
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          wasm: ['@midnight-ntwrk/onchain-runtime-v3'],
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: ['.js', '.cjs'],
      ignoreDynamicRequires: true,
    },
  },
  plugins: [
    react(),
    wasm(),
    {
      name: 'wasm-module-resolver',
      resolveId(source, importer) {
        if (
          source === '@midnight-ntwrk/onchain-runtime-v3' &&
          importer &&
          importer.includes('@midnight-ntwrk/compact-runtime')
        ) {
          return { id: source, external: false, moduleSideEffects: true };
        }
        return null;
      },
    },
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      supported: { 'top-level-await': true },
      platform: 'browser',
      format: 'esm',
      loader: { '.wasm': 'binary' },
    },
    include: ['buffer', 'object-inspect', '@subsquid/scale-codec', '@subsquid/util-internal-hex'],
    exclude: [
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-protocol',
      '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
      '@midnight-ntwrk/midnight-js-types',
      '@midnight-ntwrk/midnight-js-utils',
    ],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      'private-payroll-contract': path.resolve(__dirname, '../contracts/src/index.ts'),
      'cross-fetch': path.resolve(__dirname, 'src/cross-fetch-shim.ts'),
      'fetch-retry': path.resolve(__dirname, 'src/fetch-retry-shim.ts'),
      '@midnight-ntwrk/ledger-v8': path.resolve(__dirname, '../node_modules/@midnight-ntwrk/ledger-v8'),
      '@midnight-ntwrk/onchain-runtime-v3': path.resolve(__dirname, '../node_modules/@midnight-ntwrk/onchain-runtime-v3'),
      '@midnight-ntwrk/compact-runtime': path.resolve(__dirname, '../node_modules/@midnight-ntwrk/compact-runtime'),
      '@midnight-ntwrk/compact-js': path.resolve(__dirname, '../node_modules/@midnight-ntwrk/compact-js'),
    },
    dedupe: [
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-types',
      '@midnight-ntwrk/midnight-js-protocol',
    ],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
    mainFields: ['browser', 'module', 'main'],
  },
  server: {
    port: 3000,
    open: true,
  },
});
