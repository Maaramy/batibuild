// Generates BatiBuild brand PNG assets (icon, adaptive-icon, splash-icon)
// with a minimal pure-JS PNG encoder (no external deps).
// Run: bun scripts/generate-assets.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "assets");
mkdirSync(outDir, { recursive: true });

// ---------- minimal PNG encoder ----------
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
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- drawing helpers ----------
function makeCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}
function setPixel(canvas, x, y, r, g, b, a = 255) {
  const { size, data } = canvas;
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const na = a / 255;
  data[i] = Math.round(r * na + data[i] * (1 - na));
  data[i + 1] = Math.round(g * na + data[i + 1] * (1 - na));
  data[i + 2] = Math.round(b * na + data[i + 2] * (1 - na));
  data[i + 3] = Math.max(data[i + 3], a);
}
function fillRect(canvas, x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPixel(canvas, x, y, r, g, b, a);
}
function fillTriangle(canvas, ax, ay, bx, by, cx, cy, r, g, b, a = 255) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(canvas.size - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(canvas.size - 1, Math.ceil(Math.max(ay, by, cy)));
  const edge = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (py - y2) * (x1 - x2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = edge(x, y, ax, ay, bx, by);
      const w1 = edge(x, y, bx, by, cx, cy);
      const w2 = edge(x, y, cx, cy, ax, ay);
      const hasNeg = w0 < 0 || w1 < 0 || w2 < 0;
      const hasPos = w0 > 0 || w1 > 0 || w2 > 0;
      if (!(hasNeg && hasPos)) setPixel(canvas, x, y, r, g, b, a);
    }
  }
}
function fillRoundRect(canvas, x0, y0, x1, y1, rad, r, g, b, a = 255) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = Math.max(x0 + rad - 1, Math.min(x, x1 - rad + 1));
      const ny = Math.max(y0 + rad - 1, Math.min(y, y1 - rad + 1));
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy <= rad * rad) setPixel(canvas, x, y, r, g, b, a);
      else if (x >= x0 + rad && x <= x1 - rad) setPixel(canvas, x, y, r, g, b, a);
      else if (y >= y0 + rad && y <= y1 - rad) setPixel(canvas, x, y, r, g, b, a);
    }
  }
}

// BatiBuild palette
const EMERALD = [5, 150, 105];
const EMERALD_DARK = [6, 37, 27]; // deep emerald-black
const WHITE = [255, 255, 255];

// Draw the house glyph (roof triangle + body + door) centered in a size box.
function drawHouseGlyph(canvas, cx, top, width, white, doorColor) {
  const half = width / 2;
  const bodyTop = top + half * 0.72;
  const bodyBottom = top + half * 1.35;
  const bodyHalf = width * 0.36;
  // roof
  fillTriangle(canvas, cx - half, bodyTop, cx + half, bodyTop, cx, top, ...white);
  // body
  fillRect(canvas, cx - bodyHalf, bodyTop - 1, cx + bodyHalf, bodyBottom, ...white);
  // door (cut out)
  const doorW = width * 0.13;
  fillRect(canvas, cx - doorW / 2, bodyBottom - width * 0.42, cx + doorW / 2, bodyBottom, ...doorColor);
}

// ---------- asset: app icon (1024, full-bleed emerald, house glyph) ----------
{
  const size = 1024;
  const c = makeCanvas(size);
  // subtle vertical gradient emerald -> deep emerald
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(EMERALD[0] + (EMERALD_DARK[0] - EMERALD[0]) * t);
    const g = Math.round(EMERALD[1] + (EMERALD_DARK[1] - EMERALD[1]) * t);
    const b = Math.round(EMERALD[2] + (EMERALD_DARK[2] - EMERALD[2]) * t);
    fillRect(c, 0, y, size - 1, y, r, g, b);
  }
  // rounded-square white plate behind the glyph for contrast at small sizes
  fillRoundRect(c, 212, 212, 811, 811, 140, ...WHITE, 26);
  drawHouseGlyph(c, size / 2, 330, 430, WHITE, EMERALD);
  writeFileSync(join(outDir, "icon.png"), encodePng(size, size, c.data));
}

// ---------- asset: adaptive icon foreground (1024, transparent bg) ----------
{
  const size = 1024;
  const c = makeCanvas(size);
  // glyph kept inside the ~66% safe zone
  drawHouseGlyph(c, size / 2, 300, 400, WHITE, [0, 0, 0, 0]);
  writeFileSync(join(outDir, "adaptive-icon.png"), encodePng(size, size, c.data));
}

// ---------- asset: splash icon (512, transparent bg, white glyph) ----------
{
  const size = 512;
  const c = makeCanvas(size);
  drawHouseGlyph(c, size / 2, 140, 230, WHITE, EMERALD_DARK);
  writeFileSync(join(outDir, "splash-icon.png"), encodePng(size, size, c.data));
}

console.log("Assets generated in", outDir);