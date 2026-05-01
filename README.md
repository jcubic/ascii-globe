# ![ASCII-Globe](https://github.com/jcubic/ascii-globe/blob/master/.github/logo.svg?raw=true)

[![npm](https://img.shields.io/badge/npm-0.1.0-yellow.svg)](https://www.npmjs.com/package/ascii-globe)
[![github repo](https://img.shields.io/badge/github-repo-orange?logo=github)](https://github.com/jcubic/ascii-globe)
[![LICENSE MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jcubic/ascii-globe/blob/master/LICENSE)

Zero dependencies isomorphic ASCII-Art globe renderer in JavaScript.

## Installation

### npm

```bash
npm install ascii-globe
```

### CDN

```html
<!-- IIFE (global variable) -->
<script src="https://cdn.jsdelivr.net/npm/ascii-globe"></script>

<!-- ES Module -->
<script type="module">
import Globe from 'https://esm.run/ascii-globe';
</script>
```

## Usage

### ES Module (Node.js / Vite / bundlers)

```javascript
import Globe from 'ascii-globe';

const globe = new Globe({ size: 1.4 });
console.log(globe.render(90));
```

### CommonJS (Node.js)

```javascript
const Globe = require('ascii-globe');

const globe = new Globe({ size: 1.4 });
console.log(globe.render(90));
```

### Browser (script tag)

```html
<pre id="output"></pre>
<script src="https://cdn.jsdelivr.net/npm/ascii-globe"></script>
<script>
var globe = new Globe({ size: 1 });
document.getElementById('output').textContent = globe.render(0);
</script>
```

### Browser (ES Module)

```html
<pre id="output"></pre>
<script type="module">
import Globe from 'https://esm.run/ascii-globe';

const globe = new Globe({ size: 1 });
document.getElementById('output').textContent = globe.render(0);
</script>
```

## API

### `new Globe(options?)`

Creates a new globe instance.

| Option       | Type     | Default | Description                                         |
|--------------|----------|---------|-----------------------------------------------------|
| `size`       | `number` | `1.4`   | Scale factor. `1` produces a 120x60 character grid. |
| `land`       | `string` | `'#'`   | Character used to render land masses.               |
| `water`      | `string` | `' '`   | Character used to render water/ocean.               |
| `background` | `string` | `' '`   | Character used for the area outside the globe disk. |
| `margin`     | `number` | `0`     | Number of characters around the globe disk.         |

### `globe.render(rotation)`

Returns a string with the ASCII globe rendered at the given rotation angle.

- `rotation` — angle in degrees (0–360). Wraps around automatically, so any positive, negative, or fractional value is valid.

The returned string contains newline-separated rows forming the globe disk.

## CLI

```bash
npx ascii-globe --rotation 200
npx ascii-globe --animate
```

Or install globally:

```bash
npm install -g ascii-globe
globe --rotation 200
globe --animate
```

```
Usage: globe <--rotation <degrees> | --animate> [options]

Options:
  --rotation <degrees>  Rotation angle in degrees
  --animate             Animate the globe in the terminal
  --size <number>       Globe size multiplier (default: 1.4)
  --land <char>         Character for land (default: #)
  --water <char>        Character for water (default: " ")
  --background <char>   Character for background (default: " ")
  --margin <number>     Characters around the globe (default: 0)
  --help                Show this help message

Either --rotation or --animate is required.
```

## Examples

### Node.js terminal animation

```javascript
import Globe from 'ascii-globe';

const globe = new Globe({ size: 1, land: '#', water: ' ' });

let rotation = 0;

process.stdout.write('\x1B[?25l'); // hide cursor

setInterval(() => {
  process.stdout.write('\x1B[2J\x1B[H'); // clear + home
  process.stdout.write(globe.render(rotation));
  rotation = (rotation + 0.7) % 360;
}, 1000 / 30);
```

Run the included example:

```bash
npm run example:node
```

### Browser animation

```html
<pre id="globe"></pre>
<button id="toggle">Pause</button>
<input id="rotation" type="number" min="0" max="360" step="0.1" value="0" disabled>

<script src="https://cdn.jsdelivr.net/npm/ascii-globe"></script>
<script>
var globe = new Globe({ size: 1, land: '#', water: ' ' });
var pre = document.getElementById('globe');
var playing = true;
var rotation = 0;

function frame() {
  pre.textContent = globe.render(rotation);
  if (playing) {
    rotation = (rotation + 0.7) % 360;
    requestAnimationFrame(frame);
  }
}

document.getElementById('toggle').addEventListener('click', function() {
  playing = !playing;
  if (playing) frame();
});

frame();
</script>
```

Open `examples/browser/index.html` via a local server to run the included browser demo.

## Building from source

```bash
npm install
npm run extract   # generate globe.bin and src/data.ts from globe.png
npm run build     # compile TypeScript to dist/
```

## Acknowledgments

World map texture by Ebrahim; [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0); source [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Equirectangular_projection_world_map_without_borders.svg).

## License

Copyright (c) 2025 [Jakub T. Jankiewicz](https://jakub.jankiewicz.org/)

Released under the MIT License. See [LICENSE](LICENSE) for details.
