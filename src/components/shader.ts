/**
 * One full-screen fragment shader paints every placeholder work.
 * Each scene is built from parallax layers; `z` (0 → 1) zooms the camera
 * into the painting, near layers faster than far ones. During a transition
 * the next scene opens up from the vanishing point with a brushy edge.
 *
 * Static noise comes from baked textures (see bake.ts), never computed per frame.
 * No post-processing / bloom: glows are painted directly in the shader.
 */

export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform sampler2D uNoise;
uniform sampler2D uCanvas;

uniform int uSceneA;
uniform int uSceneB;
uniform float uZA;
uniform float uZB;
uniform float uMix;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uHasA;
uniform float uHasB;
uniform float uImgAspA;
uniform float uImgAspB;
uniform float uFitA;   // 1 = cover, 0 = contain
uniform float uFitB;

// ───────────────────────── noise (baked) ─────────────────────────
float n1(vec2 p) { return texture(uNoise, p * 0.03125).r; }
vec4  n4(vec2 p) { return texture(uNoise, p * 0.03125); }
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * texture(uNoise, p * 0.03125).r;
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s * 1.0667;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2  hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// Parallax layer: zoom toward focus f, deeper by d.
vec2 lay(vec2 p, float z, float d, vec2 f) { return (p - f) / (1.0 + z * d) + f; }

// Painted horizon-edge mask with a slightly ragged brush edge.
float below(float y, float h, float soft) { return smoothstep(soft, -soft, y - h); }

// Swaying grass field used by the meadow and the night scene.
vec3 grass(vec2 p, float t, float top, vec3 dark, vec3 light, vec3 under, out float mask) {
  float wind = 0.022 * sin(t * 1.3 + p.x * 2.6) + 0.012 * sin(t * 2.7 + p.x * 7.0)
             + 0.02 * (n1(vec2(p.x * 1.5 - t * 0.5, t * 0.2)) - 0.5);
  float hgt = clamp(top - p.y, 0.0, 0.4);
  float xs = p.x + wind * (0.6 - hgt * 1.5) * 2.0;
  // short slanted dabs at two scales, like tufts laid in with a flat brush
  float b1 = n1(vec2(xs * 110.0 + p.y * 30.0, p.y * 34.0));
  float b2 = n1(vec2(xs * 45.0 - p.y * 12.0 + 7.0, p.y * 14.0));
  float blades = b1 * 0.55 + b2 * 0.45;
  float edge = top + 0.016 * n1(vec2(xs * 70.0, 2.0)) + 0.012 * n1(vec2(xs * 18.0, 5.0));
  mask = smoothstep(0.004, -0.002, p.y - edge);
  float patchy = fbm(vec2(p.x * 3.0, p.y * 6.0) + 4.0);
  float lightAmt = 0.15 + 0.6 * smoothstep(0.35, 0.8, blades) * (0.5 + 0.5 * smoothstep(-0.28, 0.0, p.y - top));
  vec3 c = mix(dark, light, lightAmt);
  c = mix(c, c * vec3(1.15, 1.05, 0.7), smoothstep(0.45, 0.7, patchy) * 0.6);
  c = mix(c, under, smoothstep(0.02, 0.34, top - p.y) * 0.55);
  // light rolling over the grass in gusts
  float gust = smoothstep(0.45, 0.8, n1(vec2(p.x * 2.0 - t * 0.35, p.y * 3.0)));
  c += light * gust * 0.10;
  return c;
}

// ───────────────────────── 0 · meadow ─────────────────────────
vec3 meadow(vec2 p, float z, float t) {
  vec2 f = vec2(-0.02, -0.02);

  vec2 ps = lay(p, z, 0.12, f);
  vec3 col = mix(vec3(0.98, 0.84, 0.64), vec3(0.40, 0.58, 0.80), smoothstep(-0.02, 0.48, ps.y));
  col = mix(col, vec3(0.33, 0.48, 0.74), smoothstep(0.3, 0.6, ps.y) * 0.5);
  float sun = exp(-length((ps - vec2(-0.22, 0.07)) * vec2(1.0, 1.5)) * 5.5);
  col += vec3(1.0, 0.78, 0.5) * sun * 0.45;

  // clouds drift slowly; two layers at different speed
  vec2 cp = ps * vec2(2.0, 4.6) + vec2(t * 0.03, 0.0);
  float cl = fbm(cp * 1.3);
  float cm = smoothstep(0.50, 0.74, cl) * smoothstep(0.03, 0.2, ps.y);
  float shade = fbm(cp * 1.3 + vec2(0.0, 0.55));
  vec3 cc = mix(vec3(1.0, 0.93, 0.84), vec3(0.62, 0.62, 0.74), smoothstep(0.45, 0.85, shade));
  cc += vec3(1.0, 0.72, 0.45) * sun * 0.6;
  col = mix(col, cc, cm * 0.92);
  vec2 cp2 = ps * vec2(1.2, 9.0) + vec2(t * 0.012 + 4.0, 2.0);
  col = mix(col, vec3(0.98, 0.86, 0.78), smoothstep(0.6, 0.8, fbm(cp2)) * smoothstep(0.0, 0.1, ps.y) * 0.5);

  // far hills (hazy blue)
  vec2 p1 = lay(p, z, 0.3, f);
  float h1 = 0.025 + 0.07 * fbm(vec2(p1.x * 1.2 + 3.0, 0.5));
  vec3 c1 = mix(vec3(0.56, 0.63, 0.72), vec3(0.72, 0.72, 0.72), fbm(p1 * vec2(6.0, 18.0)) * 0.6);
  col = mix(col, c1, below(p1.y, h1, 0.003));

  // middle hills with a line of trees bending in the wind
  vec2 p2 = lay(p, z, 0.7, f);
  float h2 = -0.035 + 0.05 * fbm(vec2(p2.x * 1.7 + 11.0, 2.0)) + 0.02 * sin(p2.x * 2.0);
  float trees = smoothstep(0.52, 0.78, fbm(vec2(p2.x * 7.0 + sin(t * 1.1 + p2.x * 9.0) * 0.06, 3.0)));
  float ht = h2 + 0.055 * trees * (0.7 + 0.3 * n1(vec2(p2.x * 40.0, p2.y * 30.0)));
  float m2 = below(p2.y, ht, 0.003);
  vec3 c2 = mix(vec3(0.42, 0.52, 0.26), vec3(0.78, 0.74, 0.40), smoothstep(-0.1, 0.02, p2.y - h2 + 0.04) * 0.7);
  c2 = mix(c2, vec3(0.20, 0.30, 0.18), smoothstep(h2 - 0.002, h2 + 0.01, p2.y) * 0.85);   // tree canopies
  c2 += vec3(0.25, 0.18, 0.05) * smoothstep(0.5, 0.9, n1(p2 * vec2(60.0, 40.0))) * 0.25;
  col = mix(col, c2, m2);

  // near grass with flowers
  vec2 p3 = lay(p, z, 1.6, f);
  float top = -0.13 + 0.035 * sin(p3.x * 1.7 + 1.0) + 0.02 * fbm(vec2(p3.x * 2.0, 7.0));
  float gm;
  vec3 c3 = grass(p3, t, top, vec3(0.20, 0.30, 0.12), vec3(0.80, 0.76, 0.38), vec3(0.12, 0.18, 0.08), gm);
  vec2 fg = p3 * vec2(26.0, 38.0);
  vec2 fcell = floor(fg);
  vec2 fo = 0.25 + 0.5 * hash2(fcell);
  float fd = length((fract(fg) - fo) * vec2(1.0, 1.3)) + (n1(p3 * 300.0) - 0.5) * 0.12;
  float fr = 0.13 + 0.08 * hash(fcell + 2.0);
  float fl = smoothstep(fr, fr - 0.06, fd) * step(0.78, hash(fcell + 5.0)) * smoothstep(top - 0.01, top - 0.04, p3.y);
  float fh = hash(fcell + 8.0);
  vec3 flc = fh < 0.55 ? vec3(0.82, 0.20, 0.13) : (fh < 0.85 ? vec3(0.97, 0.93, 0.80) : vec3(0.62, 0.48, 0.80));
  flc *= 0.85 + 0.3 * smoothstep(fr, 0.0, fd);
  c3 = mix(c3, flc, fl * 0.9);
  col = mix(col, c3, gm);
  return col;
}

// ───────────────────────── 1 · lake at dusk ─────────────────────────
vec3 duskSky(vec2 q, float t) {
  vec3 c = mix(vec3(1.0, 0.72, 0.40), vec3(0.86, 0.44, 0.40), smoothstep(0.0, 0.14, q.y));
  c = mix(c, vec3(0.20, 0.19, 0.40), smoothstep(0.12, 0.5, q.y));
  vec2 sp = vec2(0.12, 0.045);
  float d = length((q - sp) * vec2(1.0, 1.15));
  c = mix(c, vec3(1.0, 0.93, 0.72), smoothstep(0.034, 0.03, d));
  c += vec3(1.0, 0.6, 0.3) * exp(-d * 9.0) * 0.55;
  float st = fbm(vec2(q.x * 1.4 + t * 0.008, q.y * 13.0));
  float sm = smoothstep(0.55, 0.78, st) * smoothstep(0.05, 0.12, q.y);
  vec3 scol = mix(vec3(0.95, 0.52, 0.42), vec3(0.42, 0.28, 0.42), smoothstep(0.1, 0.35, q.y));
  c = mix(c, scol, sm * 0.8);
  return c;
}

vec3 lake(vec2 p, float z, float t) {
  vec2 f = vec2(0.0, -0.09);

  vec2 ps = lay(p, z, 0.12, f);
  vec3 col = duskSky(ps, t);

  // mountains
  vec2 pm = lay(p, z, 0.3, f);
  float r = 1.0 - abs(2.0 * fbm(vec2(pm.x * 2.2 + 5.0, 1.0)) - 1.0);
  float hm = 0.012 + 0.09 * r * r;
  vec3 cm = mix(vec3(0.34, 0.24, 0.40), vec3(0.52, 0.34, 0.42), smoothstep(0.0, 0.08, pm.y) * 0.5);
  float mm = below(pm.y, hm, 0.002) * step(0.0, pm.y);
  col = mix(col, cm, mm);

  // water: rippling reflection of sky and mountains
  vec2 pw = lay(p, z, 0.55, f);
  if (pw.y < 0.0) {
    float dep = -pw.y;
    float rip = (n1(vec2(pw.x * 22.0, dep * 160.0 / (dep * 6.0 + 0.2) - t * 1.4)) - 0.5);
    vec2 rq = vec2(pw.x + rip * 0.03 * (dep + 0.05), dep + rip * 0.012);
    vec3 refl = duskSky(rq, t);
    float rr = 1.0 - abs(2.0 * fbm(vec2(rq.x * 2.2 + 5.0, 1.0)) - 1.0);
    refl = mix(refl, cm * 0.8, smoothstep(0.003, -0.003, rq.y - (0.012 + 0.09 * rr * rr)));
    vec3 wc = refl * vec3(0.72, 0.68, 0.78);
    // horizontal painted strokes and sun glitter
    float band = n1(vec2(pw.x * 4.0, dep * 90.0 + t * 0.4));
    wc *= 0.9 + 0.2 * band;
    float glit = exp(-abs(pw.x - 0.12) * (8.0 + dep * 10.0)) *
                 smoothstep(0.62, 0.9, n1(vec2(pw.x * 70.0, dep * 260.0 - t * 2.2)));
    wc += vec3(1.0, 0.82, 0.5) * glit * 0.9;
    wc = mix(wc, vec3(0.16, 0.14, 0.26), smoothstep(0.05, 0.4, dep) * 0.5);
    col = wc;
  }

  // near shore with swaying reeds
  vec2 pn = lay(p, z, 1.5, f);
  float hs = -0.21 + 0.03 * fbm(vec2(pn.x * 2.4, 3.0)) + 0.02 * sin(pn.x * 3.0);
  vec3 cs = mix(vec3(0.14, 0.11, 0.14), vec3(0.42, 0.26, 0.20), smoothstep(-0.32, hs, pn.y) * 0.8);
  cs += vec3(0.5, 0.25, 0.1) * smoothstep(0.6, 0.9, n1(pn * vec2(14.0, 60.0))) * 0.18;
  col = mix(col, cs, below(pn.y, hs, 0.003));

  float cluster = smoothstep(0.45, 0.7, fbm(vec2(pn.x * 2.2 + 8.0, 1.0)));
  float sway = (sin(t * 1.1 + pn.x * 6.0) * 0.012 + (n1(vec2(t * 0.4, pn.x)) - 0.5) * 0.01) * (pn.y - hs) * 6.0;
  float lean = (pn.y - hs) * (hash(vec2(floor((pn.x + sway) * 55.0), 7.0)) - 0.5) * 0.5;
  float rx = (pn.x + sway + lean) * 55.0;
  float cell = floor(rx);
  float rh = (0.05 + 0.24 * hash(vec2(cell, 1.0))) * cluster * step(0.45, hash(vec2(cell, 11.0)));
  float rw = 0.05 + 0.08 * hash(vec2(cell, 4.0));
  float stalk = smoothstep(rw + 0.08, rw, abs(fract(rx) - 0.3 - 0.4 * hash(vec2(cell, 6.0))))
              * smoothstep(hs + rh, hs + rh - 0.01, pn.y) * step(hs - 0.02, pn.y);
  vec3 rc = mix(vec3(0.10, 0.08, 0.10), vec3(0.62, 0.36, 0.22), smoothstep(0.0, 0.25, pn.y - hs) * 0.6);
  float head = smoothstep(0.03, 0.0, abs(pn.y - (hs + rh - 0.02))) * step(0.6, hash(vec2(cell, 3.0)));
  col = mix(col, rc, stalk * (cluster > 0.01 ? 1.0 : 0.0));
  col = mix(col, vec3(0.30, 0.17, 0.10), head * stalk);
  return col;
}

// ───────────────────────── 2 · sculpture in a niche ─────────────────────────
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float sdEllipse(vec2 p, vec2 c, vec2 r) { return (length((p - c) / r) - 1.0) * min(r.x, r.y); }
float sdBox(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

float bust(vec2 p) {
  // an abstract carved stone form: a pierced oval leaning into a smaller rounded mass
  vec2 q = p - vec2(0.0, 0.055);
  float c = cos(0.18), sn = sin(0.18);
  q = mat2(c, -sn, sn, c) * q;
  float body = sdEllipse(q, vec2(0.0, 0.0), vec2(0.075, 0.105));
  float top = sdEllipse(q, vec2(0.04, 0.115), vec2(0.045, 0.032));
  float d = smin(body, top, 0.03);
  float hole = sdEllipse(q, vec2(-0.008, 0.012), vec2(0.026, 0.038));
  d = max(d, -hole);
  float base = sdBox(p, vec2(0.0, -0.05), vec2(0.06, 0.006));
  return smin(d, base, 0.02);
}
float bustH(vec2 p) { return sqrt(clamp(-bust(p) / 0.05, 0.0, 1.0)); }

vec3 sculpture(vec2 p, float z, float t) {
  vec2 f = vec2(0.0, -0.1);

  // plaster wall with an arched niche
  vec2 pw = lay(p, z, 0.15, f);
  vec3 col = mix(vec3(0.50, 0.36, 0.24), vec3(0.70, 0.55, 0.38), fbm(pw * 5.0));
  col *= 0.75 + 0.25 * smoothstep(-0.6, 0.4, pw.x - pw.y * 0.6);
  float niche = min(sdBox(pw, vec2(0.0, -0.01), vec2(0.19, 0.19)), length(pw - vec2(0.0, 0.18)) - 0.19);
  float inN = smoothstep(0.003, -0.003, niche);
  vec3 nc = mix(vec3(0.20, 0.17, 0.17), vec3(0.42, 0.34, 0.30), smoothstep(-0.2, 0.2, pw.x + 0.1));
  nc *= 0.7 + 0.3 * smoothstep(-0.2, 0.3, pw.y);
  col = mix(col, nc, inN);
  col = mix(col, col * 0.55, smoothstep(0.02, 0.0, abs(niche + 0.006)) * 0.6);   // carved edge

  // slowly moving light
  vec3 L = normalize(vec3(-0.55 + 0.25 * sin(t * 0.17), 0.55, 0.65));

  // plinth + marble bust
  vec2 pb = lay(p, z, 0.45, f);
  float pl = sdBox(pb, vec2(0.0, -0.13), vec2(0.085, 0.085));
  vec3 plc = mix(vec3(0.40, 0.35, 0.30), vec3(0.68, 0.62, 0.55), smoothstep(0.08, -0.08, pb.x));
  plc *= 0.85 + 0.15 * fbm(pb * 30.0);
  col = mix(col, plc, smoothstep(0.002, -0.002, pl));
  col = mix(col, vec3(0.1, 0.08, 0.07), smoothstep(0.012, 0.0, abs(pb.y + 0.045)) * step(abs(pb.x), 0.085) * 0.5);

  if (abs(pb.x) < 0.14 && pb.y > -0.065 && pb.y < 0.22) {
    float d = bust(pb);
    if (d < 0.004) {
      float e = 0.003;
      float h = bustH(pb);
      vec2 g = vec2(bustH(pb + vec2(e, 0.0)) - bustH(pb - vec2(e, 0.0)),
                    bustH(pb + vec2(0.0, e)) - bustH(pb - vec2(0.0, e))) / (2.0 * e);
      vec3 N = normalize(vec3(-g * 0.045, 1.0));
      float dif = max(dot(N, L), 0.0) * 0.8 + 0.25;
      float spec = pow(max(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0), 24.0) * 0.35;
      float vein = smoothstep(0.06, 0.0, abs(sin(pb.x * 9.0 + pb.y * 5.0 + fbm(pb * 12.0) * 5.0)));
      vec3 marble = mix(vec3(0.93, 0.90, 0.85), vec3(0.62, 0.60, 0.60), vein * 0.5);
      vec3 sc = marble * dif * vec3(1.0, 0.95, 0.88) + spec;
      sc *= 0.8 + 0.2 * h;   // soft occlusion toward silhouette
      sc = mix(sc, sc * vec3(0.70, 0.72, 0.86), smoothstep(0.2, -0.4, dot(N, L)) * 0.5);
      col = mix(col, sc, smoothstep(0.003, -0.002, d));
    }
  }

  // stone floor
  vec2 pf = lay(p, z, 1.0, f);
  if (pf.y < -0.215) {
    float dy = -0.215 - pf.y;
    float row = dy * 30.0 / (dy * 4.0 + 0.3);
    float tile = smoothstep(0.08, 0.0, abs(fract(row) - 0.5) - 0.42)
               + smoothstep(0.04, 0.0, abs(fract(pf.x * 6.0 / (dy * 2.0 + 0.4) + floor(row) * 0.5) - 0.5) - 0.47);
    vec3 fc = mix(vec3(0.36, 0.29, 0.24), vec3(0.56, 0.48, 0.40), fbm(pf * vec2(8.0, 20.0)));
    fc *= 1.0 - 0.35 * clamp(tile, 0.0, 1.0);
    fc *= 0.75 + 0.35 * smoothstep(0.3, -0.2, pf.x + dy);
    col = mix(col, fc, smoothstep(0.0, 0.004, dy));
  }

  // diagonal sun shaft with drifting dust
  vec2 pr = lay(p, z, 0.9, f);
  vec2 dir = normalize(vec2(0.55, -0.85));
  float dl = abs(dot(pr - vec2(-0.45, 0.55), vec2(-dir.y, dir.x)));
  float shaft = smoothstep(0.17, 0.02, dl) * (0.55 + 0.45 * fbm(vec2(dot(pr, dir) * 3.0 - t * 0.05, dl * 8.0)));
  col += vec3(1.0, 0.82, 0.55) * shaft * 0.22;
  float dust = smoothstep(0.93, 0.99, n1(pr * 70.0 + vec2(t * 0.35, -t * 0.22)));
  col += vec3(1.0, 0.9, 0.7) * dust * shaft * 0.9;

  // velvet curtain on the near left
  vec2 pc = lay(p, z, 1.7, f);
  float cx = -0.62 + 0.03 * sin(pc.y * 14.0 + t * 0.6) + 0.04 * pc.y;
  float cm = smoothstep(0.004, -0.004, pc.x - cx);
  vec3 vel = vec3(0.35, 0.05, 0.07) * (0.5 + 0.5 * sin(pc.x * 90.0 + sin(pc.y * 6.0 + t * 0.6) * 2.0));
  col = mix(col, vel + vec3(0.05, 0.0, 0.0), cm);
  return col;
}

// ───────────────────────── 3 · stained glass ─────────────────────────
vec3 glassPalette(float h) {
  if (h < 0.28) return vec3(0.10, 0.22, 0.78);
  if (h < 0.48) return vec3(0.78, 0.08, 0.16);
  if (h < 0.64) return vec3(1.00, 0.70, 0.16);
  if (h < 0.80) return vec3(0.08, 0.52, 0.32);
  if (h < 0.90) return vec3(0.46, 0.18, 0.62);
  return vec3(0.92, 0.88, 0.74);
}

// Returns rgb light through the window and alpha = inside-window mask.
vec4 glassWin(vec2 q, float t) {
  float inside;
  if (q.y < 0.18) inside = step(abs(q.x), 0.16) * step(-0.14, q.y);
  else inside = step(length(q - vec2(-0.16, 0.18)), 0.32) * step(length(q - vec2(0.16, 0.18)), 0.32);
  if (inside < 0.5) return vec4(0.0);

  vec3 c;
  float lead;
  vec2 rc = q - vec2(0.0, 0.25);
  float rl = length(rc);
  if (rl < 0.115) {
    // rose: petals in polar coordinates
    float a = atan(rc.y, rc.x);
    float seg = floor((a + 3.14159) / 6.28318 * 12.0);
    float ring = rl < 0.04 ? 0.0 : (rl < 0.08 ? 1.0 : 2.0);
    float id = seg * 3.0 + ring;
    float fa = abs(fract((a + 3.14159) / 6.28318 * 12.0) - 0.5);
    float alt = mod(seg, 2.0);
    c = ring < 1.5 ? mix(vec3(0.80, 0.10, 0.16), vec3(1.0, 0.70, 0.18), alt)
                   : mix(vec3(0.14, 0.30, 0.86), vec3(0.10, 0.58, 0.34), alt);
    if (ring == 0.0) c = vec3(1.0, 0.80, 0.30);
    c *= 0.8 + 0.35 * smoothstep(0.0, 0.5, 0.5 - fa);
    lead = max(smoothstep(0.005, 0.002, abs(rl - 0.04)), smoothstep(0.005, 0.002, abs(rl - 0.08)));
    lead = max(lead, smoothstep(0.006, 0.003, abs(rl - 0.112)));
    lead = max(lead, step(0.04, rl) * smoothstep(0.455, 0.48, fa));
    float fl = fbm(vec2(t * 0.35 + id * 1.7, id));
    c *= 0.85 + 0.6 * fl;
  } else {
    // voronoi panes
    vec2 g = q * 11.0;
    vec2 ip = floor(g);
    vec2 fp = fract(g);
    float d1 = 8.0, d2 = 8.0;
    vec2 best = vec2(0.0);
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec2 o = vec2(float(i), float(j));
        vec2 r = o + 0.15 + 0.7 * hash2(ip + o) - fp;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; best = ip + o; }
        else if (d < d2) d2 = d;
      }
    float edge = sqrt(d2) - sqrt(d1);
    lead = smoothstep(0.09, 0.03, edge);
    lead = max(lead, smoothstep(0.006, 0.003, abs(rl - 0.118)));
    float paneDepth = smoothstep(0.0, 0.35, edge);
    float h = hash(best);
    c = glassPalette(h);
    float fl = fbm(vec2(t * 0.3 + h * 20.0, h * 7.0 + q.y * 2.0));
    c *= (0.65 + 0.8 * fl) * (0.72 + 0.28 * paneDepth);
    // seedy glass: streaks and bubbles
    c *= 0.85 + 0.3 * n1(q * vec2(90.0, 30.0) + h * 10.0);
    // saddle bars
    lead = max(lead, smoothstep(0.465, 0.485, abs(fract(q.y * 6.0) - 0.5)) * 0.8);
  }
  // window border
  float bord = q.y < 0.18 ? 0.16 - abs(q.x) : 0.32 - max(length(q - vec2(-0.16, 0.18)), length(q - vec2(0.16, 0.18)));
  bord = min(bord, q.y + 0.14);
  lead = max(lead, smoothstep(0.012, 0.006, bord));
  c = mix(c * 1.25, vec3(0.03, 0.03, 0.04), lead);
  return vec4(c, 1.0);
}

vec3 glass(vec2 p, float z, float t) {
  vec2 f = vec2(0.0, -0.1);

  vec2 pw = lay(p, z, 0.2, f);
  // stone blocks
  float row = floor(pw.y * 16.0);
  vec2 bp = vec2(pw.x * 8.0 + mod(row, 2.0) * 0.5, pw.y * 16.0);
  vec2 fb = fract(bp);
  float mortar = max(smoothstep(0.06, 0.0, fb.y), smoothstep(0.04, 0.0, min(fb.x, 1.0 - fb.x)));
  vec3 col = mix(vec3(0.10, 0.10, 0.13), vec3(0.22, 0.20, 0.22), fbm(pw * 9.0 + hash(floor(bp)) * 3.0));
  col *= 1.0 - mortar * 0.5;

  vec4 w = glassWin(pw, t);
  float wd = length((pw - vec2(0.0, 0.12)) * vec2(1.0, 0.7));
  vec3 avg = vec3(0.55, 0.38, 0.55);
  col += avg * exp(-wd * 5.5) * 0.35;                     // painted halo
  col = mix(col, w.rgb, w.a);

  // stone floor with the window's colours pooled on it
  vec2 pf = lay(p, z, 1.0, f);
  if (pf.y < -0.2) {
    float dy = -0.2 - pf.y;
    vec3 fc = mix(vec3(0.09, 0.09, 0.11), vec3(0.20, 0.19, 0.21), fbm(pf * vec2(6.0, 18.0)));
    vec2 wq = vec2(pf.x * 0.8 / (1.0 + dy * 0.8) + 0.06, -0.14 + dy * 1.9);
    vec4 pool = glassWin(wq, t);
    fc += pool.rgb * pool.a * 0.55 * smoothstep(0.32, 0.0, dy - 0.02);
    col = mix(col, fc, smoothstep(0.0, 0.004, dy));
  }

  // coloured light beams and dust
  vec2 pr = lay(p, z, 0.6, f);
  vec2 rp = pr - vec2(-0.25, 0.7);
  float a = atan(rp.x, -rp.y);
  float beam = smoothstep(0.32, 0.2, abs(a - 0.36)) * smoothstep(0.35, 0.75, length(rp));
  float streak = fbm(vec2(a * 18.0, t * 0.08));
  vec3 bc = glassPalette(fract(a * 3.0 + 0.4)) * 0.6 + 0.4;
  col += bc * beam * streak * 0.16 * step(pr.y, 0.2);
  float dust = smoothstep(0.94, 0.995, n1(pr * 80.0 + vec2(-t * 0.2, t * 0.28)));
  col += vec3(0.9, 0.85, 1.0) * dust * beam * 0.8;

  // dark columns in the foreground
  vec2 pc = lay(p, z, 1.7, f);
  float colm = smoothstep(-0.005, 0.005, 0.12 - abs(abs(pc.x) - 0.68));
  vec3 cc = vec3(0.05, 0.05, 0.06) + vec3(0.12, 0.1, 0.14) * smoothstep(0.12, 0.0, abs(abs(pc.x) - 0.6));
  col = mix(col, cc, colm);
  return col;
}

// ───────────────────────── 4 · night, the artist ─────────────────────────
vec3 night(vec2 p, float z, float t) {
  vec2 f = vec2(0.0, -0.05);

  vec2 ps = lay(p, z, 0.1, f);
  vec3 col = mix(vec3(0.10, 0.14, 0.30), vec3(0.03, 0.04, 0.12), smoothstep(-0.05, 0.5, ps.y));
  float mw = fbm(vec2(ps.x * 2.0 + ps.y * 3.0, ps.y - ps.x) * 2.5) * smoothstep(0.25, 0.0, abs(ps.y - ps.x * 0.6 - 0.15));
  col += vec3(0.25, 0.22, 0.40) * mw * 0.5;
  vec2 sg = ps * 90.0;
  vec2 sc = floor(sg);
  vec2 so = hash2(sc);
  float sd = length(fract(sg) - so);
  float tw = 0.6 + 0.4 * sin(t * (1.5 + so.x * 3.0) + so.y * 30.0);
  col += vec3(0.95, 0.92, 1.0) * smoothstep(0.12, 0.0, sd) * step(0.83, hash(sc + 4.0)) * tw;
  vec2 mp = vec2(0.17, 0.30);
  float md = length(ps - mp);
  col = mix(col, vec3(0.98, 0.95, 0.84) * (0.85 + 0.15 * fbm(ps * 60.0)), smoothstep(0.042, 0.038, md));
  col += vec3(0.5, 0.55, 0.8) * exp(-md * 10.0) * 0.35;

  // hills and a cottage with a warm lit window
  vec2 ph = lay(p, z, 0.4, f);
  float hh = -0.02 + 0.06 * fbm(vec2(ph.x * 1.6 + 2.0, 4.0));
  vec3 hc = vec3(0.06, 0.08, 0.15) + vec3(0.08, 0.1, 0.18) * smoothstep(-0.1, hh, ph.y);
  col = mix(col, hc, below(ph.y, hh, 0.003));
  vec2 hp = ph - vec2(-0.16, -0.02 + 0.06 * fbm(vec2(-0.16 * 1.6 + 2.0, 4.0)));
  float house = min(sdBox(hp, vec2(0.0, 0.018), vec2(0.03, 0.018)),
                    max(abs(hp.x) * 0.8 + (hp.y - 0.056), -(hp.y - 0.034)));
  col = mix(col, vec3(0.04, 0.04, 0.08), smoothstep(0.002, -0.001, house));
  float flick = 0.8 + 0.2 * n1(vec2(t * 3.0, 1.0));
  float win = smoothstep(0.002, 0.0, sdBox(hp, vec2(0.008, 0.016), vec2(0.007, 0.007)));
  col = mix(col, vec3(1.0, 0.72, 0.35) * flick, win);
  col += vec3(1.0, 0.6, 0.25) * exp(-length(hp - vec2(0.008, 0.016)) * 40.0) * 0.25 * flick;

  // near meadow under moonlight with fireflies
  vec2 pn = lay(p, z, 1.3, f);
  float top = -0.16 + 0.03 * sin(pn.x * 1.5 + 2.0) + 0.02 * fbm(vec2(pn.x * 2.0, 9.0));
  float gm;
  vec3 gc = grass(pn, t * 0.7, top, vec3(0.03, 0.05, 0.08), vec3(0.22, 0.30, 0.46), vec3(0.02, 0.03, 0.05), gm);
  col = mix(col, gc, gm);

  vec2 pf = lay(p, z, 0.9, f);
  vec2 fg = pf * 9.0;
  vec2 fc = floor(fg);
  vec2 fo = hash2(fc);
  vec2 fpos = 0.5 + 0.3 * vec2(sin(t * (0.4 + fo.x) + fo.y * 6.28), cos(t * (0.3 + fo.y) + fo.x * 6.28));
  float fd = length(fract(fg) - fpos);
  float blink = smoothstep(0.3, 1.0, sin(t * (0.7 + fo.x) + fo.y * 20.0));
  float alive = step(0.55, hash(fc + 9.0)) * step(pf.y, -0.02);
  col += vec3(0.9, 1.0, 0.45) * (smoothstep(0.05, 0.0, fd) + exp(-fd * 12.0) * 0.35) * blink * alive;
  return col;
}

// ───────────────────────── photos of real work ─────────────────────────
vec3 photo(sampler2D tex, float ia, float cover, vec2 p, float z) {
  vec2 q = p / (1.0 + z * 0.9);
  float H = cover > 0.5 ? max(1.0, uAspect / ia) : min(1.0, uAspect / ia) * 0.84;
  vec2 uv = vec2(q.x / (H * ia), q.y / H) + 0.5;
  vec3 mat = vec3(0.86, 0.83, 0.76) * (0.92 + 0.08 * n1(p * 200.0));
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    vec2 e = max(-uv, uv - 1.0);
    float sh = smoothstep(0.03, 0.0, max(e.x, e.y));
    return mat * (1.0 - 0.25 * sh);
  }
  return texture(tex, uv).rgb;
}

vec3 sceneCol(int id, vec2 p, float z, float t) {
  if (id == 0) return meadow(p, z, t);
  if (id == 1) return lake(p, z, t);
  if (id == 2) return sculpture(p, z, t);
  if (id == 3) return glass(p, z, t);
  return night(p, z, t);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float t = uTime;

  // painterly wobble: edges are "laid down" by a brush, not drawn by a computer
  vec4 wn = n4(p * 34.0);
  vec2 pp = p + (wn.xy - 0.5) * 0.009 + (n4(p * 7.0 + 3.0).zw - 0.5) * 0.008;

  vec3 col;
  float m = uMix;
  float r = length((p - vec2(0.0, -0.06)) * vec2(0.8, 1.0)) + (fbm(p * 5.0 + 2.0) - 0.5) * 0.3;
  float rad = m * 1.55 - 0.12;
  float mb = max(smoothstep(rad, rad - 0.14, r), smoothstep(0.9, 1.0, m));

  vec3 ca = vec3(0.0), cb = vec3(0.0);
  if (mb < 0.999) ca = uHasA > 0.5 ? photo(uTexA, uImgAspA, uFitA, pp, uZA) : sceneCol(uSceneA, pp, uZA, t);
  if (mb > 0.001) cb = uHasB > 0.5 ? photo(uTexB, uImgAspB, uFitB, pp, uZB) : sceneCol(uSceneB, pp, uZB, t);
  col = mix(ca, cb, mb);
  // warm paint along the opening edge, like wet paint pulled by the brush
  col = mix(col, col * vec3(1.05, 0.95, 0.85), smoothstep(0.1, 0.0, abs(r - rad + 0.07)) * step(0.001, m) * step(m, 0.95) * 0.5);

  // canvas surface: brush bristles, impasto relief and linen weave
  vec2 cuv = vUv * vec2(uAspect, 1.0) * 1.35;
  vec4 cv = texture(uCanvas, cuv);
  vec4 cv2 = texture(uCanvas, cuv + vec2(0.0015, 0.0015));
  float relief = (cv.g - cv2.g);
  col *= 0.9 + 0.2 * cv.g;
  col += relief * 0.22;
  col *= 0.95 + 0.08 * cv.r;
  vec4 cvf = texture(uCanvas, vUv * vec2(uAspect, 1.0) * 3.1 + 0.37);
  col *= 0.96 + 0.06 * cvf.g;
  col += (cv.b - 0.5) * 0.025;

  // aged varnish and soft vignette
  col = mix(col, col * vec3(1.02, 0.96, 0.84), 0.22);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.92);
  vec2 vq = vUv - 0.5;
  col *= 1.0 - 0.38 * pow(length(vq * vec2(1.0, 1.1)) * 1.3, 2.6);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
