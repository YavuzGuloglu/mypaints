/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE ONE FILE TO EDIT.
 *
 *  Every scene of the site is driven from this list, in order.
 *  Right now each work shows an original, procedurally painted PLACEHOLDER
 *  (a shader, `scene`). None of them are Reyhan's real works.
 *
 *  To show a real photo of her work:
 *    1. Put the photo in  /public/works/  (e.g. public/works/meadow.jpg)
 *    2. Set  image: '/works/meadow.jpg'  on that entry
 *    3. Fill in title / medium / year / size
 *  The photo then replaces the placeholder painting in the same frame,
 *  with the same zoom-in transition and canvas texture.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Procedural placeholder scenes available in the shader. */
export type SceneId = 'meadow' | 'lake' | 'sculpture' | 'glass' | 'night';

export const SCENE_INDEX: Record<SceneId, number> = {
  meadow: 0,
  lake: 1,
  sculpture: 2,
  glass: 3,
  night: 4,
};

export type Section = 'Painting' | 'Sculpture' | 'Stained glass' | 'The artist';

export interface Work {
  id: string;
  section: Section;
  /** PLACEHOLDER shader shown until `image` is set. */
  scene: SceneId;
  /** ⬇ REAL PHOTO SLOT — e.g. '/works/my-painting.jpg' (file in /public/works). */
  image?: string;
  /** 'cover' fills the frame (may crop edges); 'contain' shows the whole work on a linen mat. */
  fit?: 'cover' | 'contain';
  title: string;
  medium: string;
  year: string;
  size?: string;
  /** Short line shown under the plaque. Optional. */
  note?: string;
  /** Tint applied to the walking girl so she sits in the light of the scene. */
  girlLight: string;
  /** Static CSS painting used when WebGL is unavailable. */
  fallback: string;
}

export const site = {
  title: 'My work – Reyhan Kaya',
  artist: 'Reyhan Kaya',
  // ⬇ PLACEHOLDERS — replace with Reyhan's own words. Nothing here is a real fact yet.
  about: '[A few sentences about Reyhan, in her own words: where she works, what she is drawn to, what she is working on now.]',
  email: '[email@example.com]',
  instagram: '[@instagram]',
  // A private note from Yavuz. Change or delete it before sharing.
  dedication: 'For Reyhan, with love.',
};

export const works: Work[] = [
  {
    id: 'meadow',
    section: 'Painting',
    scene: 'meadow',
    image: undefined, // ⬅ e.g. '/works/painting-1.jpg'
    title: '[Placeholder] Morning Wind',
    medium: 'Oil on canvas',
    year: '[year]',
    size: '[size]',
    girlLight: 'rgba(255, 214, 160, 0.10)',
    fallback: 'linear-gradient(180deg,#9fb8cf 0%,#f1d2a6 42%,#7c8f55 55%,#3f5a2a 100%)',
  },
  {
    id: 'lake',
    section: 'Painting',
    scene: 'lake',
    image: undefined, // ⬅ e.g. '/works/painting-2.jpg'
    title: '[Placeholder] Still Water at Dusk',
    medium: 'Oil on canvas',
    year: '[year]',
    size: '[size]',
    girlLight: 'rgba(255, 150, 90, 0.18)',
    fallback: 'linear-gradient(180deg,#3b3c6b 0%,#d9825a 40%,#f3b76a 48%,#5b4a6a 52%,#2a2c45 100%)',
  },
  {
    id: 'sculpture',
    section: 'Sculpture',
    scene: 'sculpture',
    image: undefined, // ⬅ e.g. '/works/sculpture-1.jpg'
    title: '[Placeholder] Pierced Form in Morning Light',
    medium: 'Marble',
    year: '[year]',
    size: '[size]',
    girlLight: 'rgba(255, 200, 140, 0.12)',
    fallback: 'radial-gradient(ellipse at 50% 45%,#e9e2d4 0%,#a69780 30%,#3a2f25 70%,#1d1712 100%)',
  },
  {
    id: 'glass',
    section: 'Stained glass',
    scene: 'glass',
    image: undefined, // ⬅ e.g. '/works/glass-1.jpg'
    title: '[Placeholder] Window of Small Suns',
    medium: 'Stained glass, lead came',
    year: '[year]',
    size: '[size]',
    girlLight: 'rgba(120, 140, 255, 0.20)',
    fallback: 'radial-gradient(ellipse at 50% 35%,#f5c04a 0%,#b3243a 18%,#1f3f8f 38%,#14110f 70%)',
  },
  {
    id: 'artist',
    section: 'The artist',
    scene: 'night',
    image: undefined, // ⬅ e.g. a portrait: '/works/reyhan.jpg'
    title: 'Reyhan Kaya',
    medium: 'Painter · Sculptor · Stained glass',
    year: '',
    girlLight: 'rgba(80, 110, 200, 0.28)',
    fallback: 'linear-gradient(180deg,#0b1030 0%,#1d2552 55%,#0d1420 100%)',
  },
];
