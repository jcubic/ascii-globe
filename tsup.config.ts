import { defineConfig } from 'tsup';
import pkg from './package.json';

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author}
 * @license ${pkg.license}
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
        options.banner = {
          js: (options.banner?.js ? options.banner.js + '\n' : '') +
            'var __globePreMaps = typeof Globe !== "undefined" && Globe && Globe.maps;',
        };
        options.footer = {
          js: 'Globe = Globe.default;\nif (__globePreMaps) for (var __k in __globePreMaps) Globe.maps[__k] = __globePreMaps[__k];',
        };
      }
      if (format === 'cjs') {
        options.footer = { js: 'module.exports = module.exports.default;' };
      }
    },
  },
  {
    entry: {
      'maps/globe': 'src/maps/globe.ts',
      'maps/death-star': 'src/maps/death-star.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
    sourcemap: false,
    banner: { js: banner },
  },
  {
    entry: { 'maps/death-star.global': 'src/maps/death-star.global.ts' },
    format: ['iife'],
    clean: false,
    sourcemap: false,
    banner: { js: banner },
    outExtension() {
      return { js: '.js' };
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
