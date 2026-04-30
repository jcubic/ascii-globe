import Globe from '../../src/index.ts';

const globe = new Globe({ size: 1, land: '#', water: ' ' });

let rotation = 0;
const SPEED = 0.7;
const FPS = 30;

process.stdout.write('\x1B[?25l'); // hide cursor

process.on('SIGINT', () => {
  process.stdout.write('\x1B[?25h'); // show cursor
  process.exit();
});

setInterval(() => {
  const frame = globe.render(rotation);
  process.stdout.write('\x1B[2J\x1B[H');
  process.stdout.write(frame);
  rotation = (rotation + SPEED) % 360;
}, 1000 / FPS);
