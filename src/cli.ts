import Globe from './index';

const USAGE = `Usage: globe --rotation <degrees> [options]

Render an ASCII globe to stdout.

Options:
  --rotation <degrees>  Rotation angle in degrees (required)
  --size <number>       Globe size multiplier (default: 1.4)
  --land <char>         Character for land (default: #)
  --water <char>        Character for water (default: " ")
  --background <char>   Character for background (default: " ")
  --margin <number>     Characters around the globe (default: 0)
  --help                Show this help message

Examples:
  globe --rotation 200
  globe --rotation 90 --size 1.5 --land '#' --water '-'
  globe --rotation 0 --background '.' --margin 3
`;

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help' || key === '-h') {
      args.help = 'true';
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

if (!args.rotation) {
  process.stderr.write('Error: --rotation is required\n\n');
  process.stdout.write(USAGE);
  process.exit(1);
}

const rotation = parseFloat(args.rotation);
if (isNaN(rotation)) {
  process.stderr.write(`Error: invalid rotation value "${args.rotation}"\n`);
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

const globe = new Globe({
  size,
  land: args.land,
  water: args.water,
  background: args.background,
  margin,
});

process.stdout.write(globe.render(rotation) + '\n');
