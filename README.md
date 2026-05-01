# ASCII-Globe

```
                    --------#---##-
               -###########---#---------
            -----############--#####-------
         --------##################-----------
       ---------#################--------------#
      ----------################-----------------
    --------------#############-------------------#
   -----------------####---------------------------#
  -------------------###----------------------------#
  ----------------------####------------------------#
 ----------------------------#-----------------------#
 --------------------------------########-------------
 --------------------------------###########----------
--------------------------------#############----------
 -------------------------------################------
 --------------------------------################-----
 ---------------------------------##############------
  ----------------------------------###########------
  ----------------------------------##########-------
   --------------------------------########---------
    -------------------------------######----------
      ----------------------------#####----------
       --------------------------###------------
         -----------------------##------------
            -------------------------------
               -------------------------
                    ---#--#####---#
 _______  _______  _______  ___   ___          _______  ___      _______  _______  _______
|   _   ||       ||       ||   | |   |        |       ||   |    |       ||  _    ||       |
|  |_|  ||  _____||       ||   | |   |  ____  |    ___||   |    |   _   || |_|   ||    ___|
|       || |_____ |       ||   | |   | |____| |   | __ |   |    |  | |  ||       ||   |___
|       ||_____  ||      _||   | |   |        |   ||  ||   |___ |  |_|  ||  _   | |    ___|
|   _   | _____| ||     |_ |   | |   |        |   |_| ||       ||       || |_|   ||   |___
|__| |__||_______||_______||___| |___|        |_______||_______||_______||_______||_______|
```

Isomorphic ASCII globe renderer. Works in Node.js and the browser with no platform-specific dependencies.

## Installation

```bash
npm install ascii-globe
```

## Usage

```typescript
import Globe from 'ascii-globe';

const globe = new Globe({
  size: 1.4,   // scale factor (default: 1.4)
  land: '#',   // character for land (default: '#')
  water: ' '   // character for water (default: ' ')
});

// Render at a given rotation (0–360 degrees)
const frame = globe.render(rotation);
console.log(frame);
```

### `new Globe(options?)`

Creates a new globe instance.

| Option  | Type     | Default | Description                                         |
|---------|----------|---------|-----------------------------------------------------|
| `size`  | `number` | `1.4`   | Scale factor. `1` produces a 120x60 character grid. |
| `land`  | `string` | `'#'`   | Character used to render land masses.               |
| `water` | `string` | `' '`   | Character used to render water/ocean.               |

### `globe.render(rotation)`

Returns a string with the ASCII globe rendered at the given rotation angle.

- `rotation` — angle in degrees (0–360). Wraps around automatically, so any positive, negative, or fractional value is valid.

The returned string contains newline-separated rows forming the globe disk.

## Examples

### Node.js terminal animation

```typescript
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

<script type="module">
import Globe from 'ascii-globe';

const globe = new Globe({ size: 1, land: '#', water: ' ' });
const pre = document.getElementById('globe');
let playing = true;
let rotation = 0;

function frame() {
  pre.textContent = globe.render(rotation);
  if (playing) {
    rotation = (rotation + 0.7) % 360;
    requestAnimationFrame(frame);
  }
}

document.getElementById('toggle').addEventListener('click', () => {
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
