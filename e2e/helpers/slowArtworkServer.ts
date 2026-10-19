import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';

// A real decodable PNG close to the measured official artwork size. Generate it
// in memory so no large image binary or external image service is required.
const createArtwork = () => {
  const width = 384;
  const height = 538;
  const rows = Buffer.alloc((width * 3 + 1) * height);
  let seed = 123456789;
  for (let y = 0; y < height; y++) for (let x = 1; x <= width * 3; x++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    rows[y * (width * 3 + 1) + x] = seed & 255;
  }
  const chunk = (type: string, body: Buffer) => {
    const data = Buffer.concat([Buffer.from(type), body]);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4);
    size.writeUInt32BE(body.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2; // 8-bit RGB, standard PNG compression/filtering.
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
};

export const startSlowArtworkServer = async () => {
  const artwork = createArtwork();
  const requested = new Set<string>();
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (!path.startsWith('/art/') || !path.endsWith('.png')) {
      response.writeHead(404).end();
      return;
    }
    requested.add(path);
    response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': artwork.length,
      'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Timing-Allow-Origin': '*' });
    response.end(artwork);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No artwork server address');
  return {
    origin: `http://127.0.0.1:${address.port}`, bytes: artwork.length, requested,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
};
