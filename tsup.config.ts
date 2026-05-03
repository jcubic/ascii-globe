import { defineConfig } from 'tsup';
import pkg from './package.json';

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author}
 * Licensed under ${pkg.license}
 */`;

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    dts: true,
    clean: true,
    sourcemap: true,
    globalName: 'Globe',
    banner: { js: banner },
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
    banner: { js: `#!/usr/bin/env node\n${banner}` },
  },
]);
