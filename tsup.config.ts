import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    dts: true,
    clean: true,
    sourcemap: true,
    globalName: 'Globe',
    outExtension({ format }) {
      if (format === 'iife') return { js: '.global.js' };
      return {};
    },
    esbuildOptions(options, { format }) {
      if (format === 'iife') {
        options.footer = { js: 'Globe = Globe.default;' };
      }
      if (format === 'cjs') {
        options.footer = { js: 'module.exports = module.exports.default;' };
      }
    },
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    clean: false,
    sourcemap: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
