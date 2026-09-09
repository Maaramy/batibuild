// Generates BudgetBati brand placeholder PNG assets (icon, adaptive icon,
// splash, favicon) as valid RGBA PNGs without external image dependencies.
// Run: bun scripts/generate-brand-assets.mjs   (from the mobile/ directory)
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "assets", "images");
mkdirSync(OUT, { recursive: true });

// Brand palette (deep green + emerald, from the web design system)
const BG_TOP = [0x0e, 0x4a, 0x3a]; // #0E4A3A
const BG_BOTTOM = [0x07, 0x29, 0x1f]; // #07291F
const EMERALD = [0x10, 0xb9, 0x81]; // #10B981
const EMERALD_LIGHT = [0x6e, 0xe7, 0xb7]; // #6EE7B7 (emerald-300)

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// Diamond mark (rotated square) + inner cutout
function markColor(x, y, size, inner) {
  const cx = size / 2;
  const hd = size * 0.3; // outer half-diagonal
  const innerHd = hd * 0.58;
  const d = Math.abs(x - cx) + Math.abs(y - cx);
  if (d <= innerHd) return inner; // inner cutout
  if (d <= hd) return EMERALD_LIGHT; // outer diamond
  return null;
}

function png(size, { transparent = false, monochrome = false, gradient = false } = {}) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: none
    const t = size <= 1 ? 0 : y / (size - 1);
    for (let x = 0; x < size; x++) {
      const o = 1 + x * 4;
      let r, g, b, a = 255;
      if (transparent) {
        const c = markColor(x, y, size, monochrome ? [255, 255, 255] : EMERALD);
        if (c) {
          [r, g, b] = c;
        } else {
          [r, g, b, a] = [0, 0, 0, 0];
        }
      } else {
        if (gradient) {
          r = clamp(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t);
          g = clamp(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t);
          b = clamp(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t);
        } else {
          [r, g, b] = BG_BOTTOM;
        }
        const c = markColor(x, y, size, monochrome ? [255, 255, 255] : null);
        if (c) [r, g, b] = c;
      }
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
      row[o + 3] = a;
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };
  const idat = deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// CRC32 table
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const files = {
  "icon.png": png(1024, { gradient: true }),
  "adaptive-icon.png": png(1024, { gradient: true }),
  "adaptive-icon-monochrome.png": png(1024, { transparent: true, monochrome: true }),
  "splash-icon.png": png(512, { transparent: true }),
  "favicon.png": png(64, { gradient: true }),
};

for (const [name, buf] of Object.entries(files)) {
  writeFileSync(path.join(OUT, name), buf);
  console.log(`✓ ${name} (${buf.length} bytes)`);
}
console.log("Done — assets written to", OUT);