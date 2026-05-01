#!/usr/bin/env node

import Globe from '../../dist/index.js';

// ANSI escape codes used:
// \x1B[?25l  — hide cursor
// \x1B[?25h  — show cursor
// \x1B[<n>F  — move cursor up n lines (to beginning of line)
// \x1B[2K    — clear entire current line
// \x1B[32m   — green foreground
// \x1B[34m   — blue foreground
// \x1B[31m   — red foreground
// \x1B[m     — reset all attributes

const globe = new Globe({
  size: 1,
  pins: [
    { lat: 52.23, long: 21.01 },   // Warsaw
    { lat: 40.71, long: -74.01 },  // New York
    { lat: 39.90, long: 116.40 },  // Beijing
    { lat: -22.91, long: -43.17 }, // Rio de Janeiro
    { lat: -26.20, long: 28.04 },  // Johannesburg
    { lat: -37.81, long: 144.96 }, // Melbourne
  ],
  format(type, length) {
    const chars = [' ', '-', '#', '@'];
    const colors = ['', '\x1B[34m', '\x1B[32m', '\x1B[31m'];
    const text = (chars[type] ?? chars[3]).repeat(length);
    const color = colors[type] ?? colors[3];
    if (!color) return text;
    return color + text + '\x1B[m';
  },
});

let rotation = 0;
const SPEED = 0.7;
const FPS = 30;

const frameLines = globe.render(0).split('\n');
const termRows = process.stdout.rows || frameLines.length;
const lines = Math.min(frameLines.length, termRows - 1);
const offset = Math.max(0, Math.floor((frameLines.length - lines) / 2));

process.stdout.write('\x1B[?25l');

process.on('SIGINT', () => {
  process.stdout.write('\x1B[?25h\n');
  process.exit();
});

let first = true;

setInterval(() => {
  if (!first) {
    process.stdout.write(`\x1B[${lines}F`);
  }
  first = false;
  const frame = globe.render(rotation).split('\n').slice(offset, offset + lines);
  const output = frame.map(line => '\x1B[2K' + line).join('\n');
  process.stdout.write(output + '\n');
  rotation = (rotation + SPEED) % 360;
}, 1000 / FPS);
