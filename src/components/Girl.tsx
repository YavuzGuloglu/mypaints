import { useEffect, useRef } from 'react';
import { journey, segment, LAST } from './journey';
import { works } from '../data/works';

/**
 * The little painter who walks through every work. Her steps are driven by the
 * scroll: she walks while the camera travels and rests while you look.
 */
const STRIDES_PER_WORK = 3.5;

const shade: Record<string, number> = { meadow: 1, lake: 0.88, sculpture: 0.86, glass: 0.72, night: 0.58 };

export default function Girl() {
  const root = useRef<HTMLDivElement>(null);
  const legF = useRef<SVGGElement>(null);
  const legB = useRef<SVGGElement>(null);
  const shinF = useRef<SVGGElement>(null);
  const shinB = useRef<SVGGElement>(null);
  const armF = useRef<SVGGElement>(null);
  const armB = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const hair = useRef<SVGPathElement>(null);
  const skirt = useRef<SVGPathElement>(null);

  useEffect(() => {
    let raf = 0;
    let t = 0;
    let last = performance.now();
    let lastShade = '';
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!journey.reduced) t += dt;
      const { i, f, mix, next } = segment(journey.g);
      const along = (i + f) / LAST;
      const phase = (i + f) * STRIDES_PER_WORK * Math.PI * 2;
      const walking = journey.reduced ? 0 : Math.min(1, Math.abs(journey.target - journey.g) * 12) * (f > 0 && f < 1 ? 1 : 0.3);
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      const amp = 24 * walking + 0;
      const r = (el: SVGGElement | null, a: number, x: number, y: number) =>
        el?.setAttribute('transform', `rotate(${a.toFixed(2)} ${x} ${y})`);
      r(legF.current, s * amp, 50, 112);
      r(legB.current, -s * amp, 50, 112);
      r(shinF.current, Math.max(0, -c) * 34 * walking, 50, 150);
      r(shinB.current, Math.max(0, c) * 34 * walking, 50, 150);
      r(armF.current, -s * amp * 0.8 - 8, 50, 64);
      r(armB.current, s * amp * 0.8 + 6, 50, 64);
      const bob = -Math.abs(c) * 2.4 * walking + Math.sin(t * 1.6) * 0.5;
      body.current?.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`);

      // wind in hair and dress
      const w = Math.sin(t * 1.7) * 3 + Math.sin(t * 3.1) * 1.5;
      hair.current?.setAttribute(
        'd',
        `M44 22 C30 22 26 36 27 50 C${22 + w} 64 ${14 + w} 74 ${10 + w * 1.6} 82 C${20 + w} 80 ${28 + w * 0.6} 72 33 62 C36 54 40 44 46 40 Z`,
      );
      const sw = Math.sin(t * 1.9) * 2 + s * 2 * walking;
      skirt.current?.setAttribute(
        'd',
        `M38 60 C34 84 ${27 + sw * 0.4} 122 ${22 + sw} 146 C40 ${151 + sw * 0.3} 62 ${151 - sw * 0.3} ${80 + sw} 144 C${73 + sw * 0.4} 120 66 86 62 60 Z`,
      );

      const el = root.current;
      if (el) {
        el.style.left = `${6 + along * 68}%`;
        const k = mix > 0.5 ? next : i;
        const key = works[k].scene;
        if (key !== lastShade) {
          lastShade = key;
          el.style.setProperty('--shade', String(shade[key] ?? 1));
          el.style.setProperty('--glow', works[k].girlLight);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="girl" aria-hidden="true">
      <svg viewBox="0 0 100 200" width="100%" height="100%">
        <defs>
          <filter id="brushy" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
          </filter>
          <linearGradient id="coat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7a3f1d" />
            <stop offset="0.55" stopColor="#c0772d" />
            <stop offset="1" stopColor="#e0a24a" />
          </linearGradient>
          <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c98a6c" />
            <stop offset="1" stopColor="#f0c2a2" />
          </linearGradient>
          <radialGradient id="shadow">
            <stop offset="0" stopColor="rgba(0,0,0,0.45)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="52" cy="196" rx="34" ry="5" fill="url(#shadow)" />
        <g filter="url(#brushy)">
          <g ref={body}>
            {/* back arm */}
            <g ref={armB}>
              <path d="M48 64 C46 80 46 92 47 104" stroke="#8c4a22" strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="47" cy="106" r="4" fill="#b87a5e" />
            </g>
            {/* back leg */}
            <g ref={legB}>
              <path d="M50 112 L50 150" stroke="#3b2a2a" strokeWidth="8" strokeLinecap="round" />
              <g ref={shinB}>
                <path d="M50 150 L50 186" stroke="#2c2024" strokeWidth="6.5" strokeLinecap="round" />
                <path d="M46 184 C46 192 52 194 61 193 C62 189 57 187 53 186 Z" fill="#2a1a14" />
              </g>
            </g>
            {/* hair behind */}
            <path ref={hair} fill="#4a2416" />
            {/* coat dress */}
            <path ref={skirt} fill="url(#coat)" />
            <path d="M40 62 C42 74 44 90 44 112" stroke="#f3d79b" strokeOpacity="0.35" strokeWidth="2" fill="none" />
            {/* front leg */}
            <g ref={legF}>
              <path d="M51 112 L51 150" stroke="#4a3434" strokeWidth="8" strokeLinecap="round" />
              <g ref={shinF}>
                <path d="M51 150 L51 186" stroke="#3a2a2e" strokeWidth="6.5" strokeLinecap="round" />
                <path d="M47 184 C47 192 53 194 63 193 C64 189 59 187 54 186 Z" fill="#3a2418" />
              </g>
            </g>
            {/* collar */}
            <path d="M40 58 C46 64 56 64 62 58 L60 54 C54 57 47 57 42 54 Z" fill="#efe4cf" />
            {/* head */}
            <path d="M50 52 L50 44" stroke="#d9a283" strokeWidth="7" />
            <path
              d="M38 32 C38 20 46 14 54 15 C63 16 67 24 66 31 C68 33 69 35 67 37 C66 39 65 41 65 43 C63 48 56 50 50 48 C42 46 38 40 38 32 Z"
              fill="url(#skin)"
            />
            <circle cx="60" cy="30" r="1.3" fill="#2a1712" />
            <path d="M60 39 C62 40 63 40 64 39" stroke="#a5523e" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <circle cx="58" cy="36" r="2.6" fill="#e58f7d" opacity="0.45" />
            {/* hair top and fringe */}
            <path d="M36 32 C34 16 48 10 58 13 C64 15 67 20 66 25 C60 21 54 22 50 26 C47 30 44 34 40 38 Z" fill="#5a2c1a" />
            {/* beret */}
            <path d="M34 20 C34 10 50 5 62 9 C70 12 70 17 64 19 C54 21 44 22 34 20 Z" fill="#9e1f2b" />
            <path d="M56 6 L57 2" stroke="#9e1f2b" strokeWidth="2" strokeLinecap="round" />
            {/* front arm with a paintbrush */}
            <g ref={armF}>
              <path d="M52 64 C54 80 55 92 56 104" stroke="#b56a2c" strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="56.5" cy="106" r="4" fill="#e7b291" />
              <path d="M55 108 L70 92" stroke="#5c3a1e" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M69 93 L74 87" stroke="#2b5fb0" strokeWidth="3.2" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
