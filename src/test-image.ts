// PNG files for the image fields of the Add / Edit forms, made on the fly in the size the form asks for
// (e.g. "Upload Image (666*355)"), so no binary files live in the repo.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = path.join(__dirname, '..', 'test-results', 'images');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Path of a solid-colour PNG of the given size (created once per size). */
export function testImage(width = 400, height = 300): string {
  const file = path.join(dir, `autotest-${width}x${height}.png`);
  if (fs.existsSync(file)) return file;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([0xd8, 0x30, 0x30], 1 + x * 3); // Cinescape red
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, png);
  return file;
}
