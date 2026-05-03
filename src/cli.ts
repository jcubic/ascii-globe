import Globe from './index';

const USAGE = `Usage: globe <--rotation <degrees> | --animate> [options]

Render an ASCII globe to stdout.

Options:
  --rotation <degrees>  Rotation angle in degrees
  --animate             Animate the globe in the terminal
  --size <number>       Globe size multiplier (default: 1.4)
  --land <char>         Character for land (default: #)
  --water <char>        Character for water (default: -)
  --background <char>   Character for background (default: " ")
  --margin <number>     Characters around the globe (default: 0)
  --margin-block <n>    Vertical margin (overrides --margin)
  --margin-inline <n>   Horizontal margin (overrides --margin)
  --pin <char>          Character for location pins (default: @)
  --pin-size <number>   Size of pin markers (default: 1)
  --pins <coords>       Pin locations as lat,long pairs separated by ;
  --help                Show this help message

Either --rotation or --animate is required.

Examples:
  globe --rotation 200
  globe --animate
  globe --animate --size 1.5 --land '#' --water '-'
  globe --rotation 0 --background '.' --margin 3
  globe --rotation 20 --pins '52.23,21.01;40.71,-74.01'
`;

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help' || key === '-h') {
      args.help = 'true';
    } else if (key === '--animate') {
      args.animate = 'true';
    } else if (key.startsWith('--') && i + 1 < argv.length) {
      args[key.slice(2)] = argv[++i];
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || process.argv.length <= 2) {
  process.stdout.write(USAGE);
  process.exit(args.help ? 0 : 1);
}

if (!args.rotation && !args.animate) {
  process.stderr.write('Error: either --rotation or --animate is required\n\n');
  process.stdout.write(USAGE);
  process.exit(1);
}

const size = args.size !== undefined ? parseFloat(args.size) : undefined;
if (size !== undefined && isNaN(size)) {
  process.stderr.write(`Error: invalid size value "${args.size}"\n`);
  process.exit(1);
}

const margin = args.margin !== undefined ? parseInt(args.margin, 10) : undefined;
if (margin !== undefined && isNaN(margin)) {
  process.stderr.write(`Error: invalid margin value "${args.margin}"\n`);
  process.exit(1);
}

const marginBlock = args['margin-block'] !== undefined ? parseInt(args['margin-block'], 10) : undefined;
if (marginBlock !== undefined && isNaN(marginBlock)) {
  process.stderr.write(`Error: invalid margin-block value "${args['margin-block']}"\n`);
  process.exit(1);
}

const marginInline = args['margin-inline'] !== undefined ? parseInt(args['margin-inline'], 10) : undefined;
if (marginInline !== undefined && isNaN(marginInline)) {
  process.stderr.write(`Error: invalid margin-inline value "${args['margin-inline']}"\n`);
  process.exit(1);
}

let pins: Array<{ lat: number; long: number }> | undefined;
if (args.pins) {
  pins = args.pins.split(';').map(pair => {
    const [latStr, longStr] = pair.split(',');
    const lat = parseFloat(latStr);
    const long = parseFloat(longStr);
    if (isNaN(lat) || isNaN(long)) {
      process.stderr.write(`Error: invalid pin coordinates "${pair}"\n`);
      process.exit(1);
    }
    return { lat, long };
  });
}

function unescapeAnsi(s: string): string {
  return s.replace(/\\x1b/gi, '\x1B').replace(/\\e/g, '\x1B').replace(/\\033/g, '\x1B');
}

const ANSI_RE = /^(\x1B\[[0-9;]*m)*(.)(\x1B\[[0-9;]*m)*$/;

function splitAnsi(s: string): { prefix: string; char: string; suffix: string } {
  const match = s.match(ANSI_RE);
  if (match) {
    return { prefix: match[1] ?? '', char: match[2], suffix: match[3] ?? '' };
  }
  return { prefix: '', char: s, suffix: '' };
}

const parts = [
  splitAnsi(args.background ? unescapeAnsi(args.background) : ' '),
  splitAnsi(args.water ? unescapeAnsi(args.water) : '-'),
  splitAnsi(args.land ? unescapeAnsi(args.land) : '#'),
  splitAnsi(args.pin ? unescapeAnsi(args.pin) : '@'),
];

const globe = new Globe({
  size,
  margin,
  marginBlock,
  marginInline,
  pinSize: args['pin-size'] !== undefined ? parseFloat(args['pin-size']) : undefined,
  pins,
  format(type, length) {
    const p = parts[type] ?? parts[3];
    const text = p.char.repeat(length);
    if (!p.prefix && !p.suffix) return text;
    return p.prefix + text + p.suffix;
  },
});

if (args.animate) {
  let rotation = args.rotation !== undefined ? parseFloat(args.rotation) : 0;
  const frameLines = globe.render(0).split('\n');
  const termRows = process.stdout.rows || frameLines.length;
  const lines = Math.min(frameLines.length, termRows - 1);
  const offset = Math.max(0, Math.floor((frameLines.length - lines) / 2));
  process.stdout.write('\x1B[?25l');
  process.on('SIGINT', () => {
    process.stdout.write('\x1B[?25h\n');
    process.exit(0);
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
    rotation = (rotation + 0.7) % 360;
  }, 1000 / 30);
} else {
  const rotation = parseFloat(args.rotation);
  if (isNaN(rotation)) {
    process.stderr.write(`Error: invalid rotation value "${args.rotation}"\n`);
    process.exit(1);
  }
  process.stdout.write(globe.render(rotation) + '\n');
}
