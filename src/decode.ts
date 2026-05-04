export function decodeTextureData(data: string): { width: number; height: number; mask: Uint8Array } {
  const raw = atob(data);
  const bin = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
  const width = (bin[0] << 8) | bin[1];
  const height = (bin[2] << 8) | bin[3];
  const pixels = width * height;
  const mask = new Uint8Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const nibble = (i & 1) ? (bin[4 + (i >> 1)] & 0x0F) : (bin[4 + (i >> 1)] >> 4);
    mask[i] = nibble * 17;
  }
  return { width, height, mask };
}
