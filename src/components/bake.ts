import * as THREE from 'three';

/**
 * Static noise is baked ONCE into textures on the CPU, so the fragment shader
 * does cheap texture lookups instead of computing fbm per pixel per frame.
 * (Lesson from the previous site: running static noise every frame hurt phones.)
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable smooth value noise grid, sampled with quintic interpolation. */
function tileNoise(size: number, cells: number, seed: number) {
  const rnd = mulberry32(seed);
  const grid = new Float32Array(cells * cells).map(() => rnd());
  const out = new Float32Array(size * size);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const gy = (y / size) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = fade(gx - x0);
      const fy = fade(gy - y0);
      const x1 = (x0 + 1) % cells;
      const y1 = (y0 + 1) % cells;
      const a = grid[y0 * cells + x0];
      const b = grid[y0 * cells + x1];
      const c = grid[y1 * cells + x0];
      const d = grid[y1 * cells + x1];
      out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

/**
 * RGBA noise: four independent tileable value-noise channels.
 * One texture repeat = 32 noise cells, so in the shader `noise(p)` = texture(p / 32).
 */
export function bakeNoiseTexture() {
  const size = 256;
  const chans = [11, 23, 37, 51].map((s) => tileNoise(size, 32, s));
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.round(chans[c][i] * 255);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Canvas + paint surface, baked once:
 *  R = linen weave, G = bristle streaks (directional brush marks), B = fine grain.
 */
export function bakeCanvasTexture() {
  const size = 512;
  const rnd = mulberry32(7);
  const data = new Uint8Array(size * size * 4);

  // Bristle streak field: many short oriented strokes accumulated into a buffer.
  const streak = new Float32Array(size * size);
  const strokes = 2600;
  for (let s = 0; s < strokes; s++) {
    const cx = rnd() * size;
    const cy = rnd() * size;
    const ang = (rnd() - 0.5) * 1.1 + (cy / size > 0.5 ? 0.25 : -0.2);
    const len = 14 + rnd() * 34;
    const wid = 2 + rnd() * 4;
    const amp = (rnd() - 0.5) * 0.9;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const bristles = 5;
    const phase = rnd() * 10;
    for (let t = -len; t < len; t += 1) {
      for (let w = -wid; w < wid; w += 1) {
        const px = Math.round(cx + ca * t - sa * w);
        const py = Math.round(cy + sa * t + ca * w);
        const ix = ((px % size) + size) % size;
        const iy = ((py % size) + size) % size;
        const taper = 1 - Math.abs(t) / len;
        const bristle = 0.5 + 0.5 * Math.sin((w / wid) * Math.PI * bristles + phase);
        streak[iy * size + ix] += amp * taper * (0.4 + 0.6 * bristle);
      }
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      // Plain-weave linen: alternating over/under threads with slight irregularity.
      const tx = (x % 4) / 4;
      const ty = (y % 4) / 4;
      const over = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const thread = over ? Math.sin(tx * Math.PI) : Math.sin(ty * Math.PI);
      const weave = 0.55 + 0.35 * thread + (rnd() - 0.5) * 0.2;
      const st = 0.5 + Math.max(-0.5, Math.min(0.5, streak[i] * 0.6));
      const grain = rnd();
      data[i * 4] = Math.round(Math.max(0, Math.min(1, weave)) * 255);
      data[i * 4 + 1] = Math.round(st * 255);
      data[i * 4 + 2] = Math.round(grain * 255);
      data[i * 4 + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
