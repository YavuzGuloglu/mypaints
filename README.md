# My work

A small, living gallery painting, sculpture and stained glass.

The screen itself is an antique gilded frame. Scroll (or swipe) and the camera
travels *into* the painting through parallax layers, until the next work opens
up from the vanishing point. A little painter in a red beret walks through every
work, taking her steps as you scroll.

**Stack:** Astro 7 · React 19 · React Three Fiber / Three.js (one full-screen
fragment shader) · plain CSS. Deployed on Vercel (`vercel.json`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Adding Reyhan's real photos

> Every painting you see right now is an **original procedural placeholder**
> (a shader), not her work and not anyone else's. The titles say `[Placeholder]`.

Everything is driven from one file: **[`src/data/works.ts`](src/data/works.ts)**.

1. Put the photo in `public/works/`, e.g. `public/works/meadow.jpg`
   (JPG/WebP, ~2400px on the long side is plenty).
2. In `src/data/works.ts`, on that work's entry set:
   ```ts
   image: '/works/meadow.jpg',
   fit: 'cover',            // or 'contain' to show the whole piece on a linen mat
   title: 'Real title',
   medium: 'Oil on canvas',
   year: '2025',
   size: '60 × 80 cm',
   ```
3. Done. The photo replaces the placeholder inside the same frame, with the same
   zoom-in transition and canvas texture.

- **Add more works:** copy an entry. `scene` is only the placeholder used while
  `image` is empty, so you can reuse any scene id.
- **Sections:** `section` is `'Painting'`, `'Sculpture'`, `'Stained glass'` or
  `'The artist'`; the label in the top-left corner follows it.
- **About text, email, Instagram:** the `site` object at the top of the same
  file. These are obvious placeholders in `[brackets]`. No biography has been
  invented.
- **Dedication:** `site.dedication` is a private line from Yavuz. Change it or
  set it to `''`.
- **Fallback image:** `fallback` is a CSS gradient shown only on devices
  without WebGL. When `image` is set, the fallback uses the photo.

## How it stays smooth on phones

- No bloom or post-processing (that's what made iPhones flicker and lose the WebGL context).
- Pixel ratio capped at 1.25 on phones and iOS (1.6 on desktop), and it drops further if frames are slow.
- Static noise and the canvas/brush texture are baked into textures once at startup.
- `webglcontextlost` remounts the canvas. After 3 losses, or if the shader fails
  to compile, the site switches to a static CSS version (append `?static` to the URL to preview it).
- No drei `<Html>`: every caption is plain DOM above the canvas, so there is no mount race.
- `prefers-reduced-motion`: animation time freezes, scrolling jumps instead of easing, and the girl doesn't walk.

## Files

| File | What it is |
| --- | --- |
| `src/data/works.ts` | **The content.** Works, captions, about text, photo slots |
| `src/components/shader.ts` | The five placeholder paintings and the transition |
| `src/components/frameSvg.ts` | The gilded frame (SVG 9-slice border image) |
| `src/components/Girl.tsx` | The little painter |
| `src/components/Gallery.tsx` | Scroll, overlays, plaque, WebGL fallback |
| `src/components/bake.ts` | Noise and canvas textures baked once |
