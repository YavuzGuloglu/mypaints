import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { site, works } from '../data/works';
import { journey, segment, LAST } from './journey';
import { frameImage } from './frameSvg';
import Girl from './Girl';

const PaintingCanvas = lazy(() => import('./PaintingCanvas'));

/** How far you scroll per work, in viewport heights. */
const SCROLL_PER_WORK = 1.6;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function detectLowPower() {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return iOS || coarse || Math.min(window.innerWidth, window.innerHeight) < 600;
}

/** Static, non-WebGL painting (used when WebGL is missing or keeps getting lost). */
function Fallback() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const bg = (k: number) => {
      const w = works[k];
      return w.image ? `center / ${w.fit === 'contain' ? 'contain' : 'cover'} no-repeat url("${w.image}"), #d8d2c4` : w.fallback;
    };
    const loop = () => {
      const { i, f, mix, next } = segment(journey.g);
      if (a.current && b.current) {
        a.current.style.background = bg(i);
        a.current.style.transform = `scale(${1 + f * 0.25})`;
        b.current.style.background = bg(next);
        b.current.style.opacity = String(next === i ? 0 : mix);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="fallback">
      <div ref={a} className="fallback-layer" />
      <div ref={b} className="fallback-layer" />
    </div>
  );
}

export default function Gallery() {
  const [mode, setMode] = useState<'pending' | 'webgl' | 'fallback'>('pending');
  const [lowPower, setLowPower] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const losses = useRef(0);

  const intro = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const plaque = useRef<HTMLDivElement>(null);
  const about = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    setLowPower(detectLowPower());
    const forceStatic = new URLSearchParams(location.search).has('static');
    setMode(!forceStatic && hasWebGL2() ? 'webgl' : 'fallback');

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setReduced = () => (journey.reduced = mq.matches);
    setReduced();
    mq.addEventListener('change', setReduced);

    const per = () => window.innerHeight * SCROLL_PER_WORK;
    const onScroll = () => {
      journey.target = Math.min(LAST, Math.max(0, window.scrollY / per()));
    };
    onScroll();
    journey.g = journey.target;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      journey.g = journey.reduced
        ? journey.target
        : journey.g + (journey.target - journey.g) * (1 - Math.exp(-dt * 5));
      if (Math.abs(journey.target - journey.g) < 1e-4) journey.g = journey.target;

      const { i, f, next } = segment(journey.g);
      // Captions: the current work's plaque fades out as we dive in; the next fades in on arrival.
      const arriving = f > 0.72 && next !== i;
      const k = arriving ? next : i;
      const op = arriving ? smooth(0.82, 1.0, f) : 1 - smooth(0.15, 0.42, f);
      if (k !== shownRef.current) {
        shownRef.current = k;
        setShown(k);
      }
      if (plaque.current) plaque.current.style.opacity = String(op);
      if (label.current) label.current.style.opacity = String(op);
      if (about.current) about.current.style.opacity = String(k === LAST ? op : 0);
      if (about.current) about.current.style.visibility = k === LAST && op > 0.02 ? 'visible' : 'hidden';
      if (intro.current) {
        const io = 1 - smooth(0.02, 0.12, journey.g);
        intro.current.style.opacity = String(io);
        intro.current.style.transform = `translateY(${(-journey.g * 120).toFixed(1)}px)`;
      }
      if (hint.current) hint.current.style.opacity = String(1 - smooth(0.0, 0.05, journey.g));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      mq.removeEventListener('change', setReduced);
    };
  }, []);

  const onContextLost = () => {
    losses.current += 1;
    if (losses.current >= 3) {
      setMode('fallback');
      return;
    }
    // Remount the whole canvas with a fresh GL context.
    window.setTimeout(() => setCanvasKey((k) => k + 1), 250);
  };

  const w = works[shown];
  const sectionIndex = [...new Set(works.map((x) => x.section))].indexOf(w.section);

  return (
    <>
      <div className="stage" style={{ ['--frame-img' as string]: frameImage }}>
        <div className="opening">
          {mode === 'webgl' && (
            <Suspense fallback={null}>
              <PaintingCanvas
                key={canvasKey}
                lowPower={lowPower}
                onContextLost={onContextLost}
                onShaderError={() => setMode('fallback')}
              />
            </Suspense>
          )}
          {mode === 'fallback' && <Fallback />}

          <div className="section-label" ref={label} aria-hidden="true">
            <span className="roman">{ROMAN[sectionIndex]}</span>
            <span>{w.section}</span>
          </div>

          <div className="intro" ref={intro}>
            <p className="intro-kicker">A small gallery</p>
            <h1>
              My work <span className="dash">–</span> <em>{site.artist}</em>
            </h1>
            <p className="intro-sub">Painting · Sculpture · Stained glass</p>
          </div>

          <div className="about" ref={about}>
            <p className="about-kicker">About the artist</p>
            <h2>{site.artist}</h2>
            <p className="about-text">{site.about}</p>
            <p className="about-contact">
              <span>{site.email}</span>
              <span className="dot">·</span>
              <span>{site.instagram}</span>
            </p>
            {site.dedication && <p className="dedication">{site.dedication}</p>}
          </div>

          <Girl />

          <div className="signature" aria-hidden="true">
            {site.title}
          </div>
          <div className="scroll-hint" ref={hint} aria-hidden="true">
            <div className="scroll-hint-inner">
              <span>Scroll to step inside</span>
              <i />
            </div>
          </div>
          <div className="inner-shadow" />
        </div>
        <div className="frame" />
        <div className="frame-light" />
        <div className="plaque" ref={plaque} aria-live="polite">
          <strong>{w.title}</strong>
          <span>{[w.medium, w.year, w.size].filter(Boolean).join(' · ')}</span>
        </div>
      </div>

      {/* The scroll track. Real, readable content for screen readers and no-JS. */}
      <main className="track" style={{ height: `${LAST * SCROLL_PER_WORK * 100 + 100}vh` }}>
        {works.map((x, k) => (
          <section key={x.id} className="sr-only" style={{ top: `${k * SCROLL_PER_WORK * 100}vh` }}>
            <h2>{x.title}</h2>
            <p>
              {x.section}. {x.medium} {x.year}
            </p>
          </section>
        ))}
      </main>
    </>
  );
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
