/**
 * Antique gilded frame, drawn once as an SVG and used as a 9-slice CSS
 * border-image, so the frame is pixel-sharp at any screen size and costs
 * nothing per frame. It hugs the edges of the screen: the monitor itself
 * becomes the frame.
 *
 * Source is 240×240, slices of 80: corners are 80×80, edge tiles are 80×80
 * and repeat ("round") along each side. The edge tile is drawn once for the
 * top side (outside at y = 0) and rotated for the other three.
 */

const edgeTile = `
<g id="edge">
  <rect width="80" height="80" fill="url(#gBase)"/>
  <!-- outer lip -->
  <rect y="0" width="80" height="7" fill="url(#gLip)"/>
  <!-- convex torus with acanthus leaves -->
  <rect y="7" width="80" height="24" fill="url(#gTorus)"/>
  <g fill="url(#gLeaf)" stroke="#3a2408" stroke-width="0.8" stroke-opacity="0.7">
    <path d="M0 30 C2 18 12 10 22 11 C17 14 15 19 18 24 C12 21 7 24 6 30 Z"/>
    <path d="M20 30 C22 18 32 10 42 11 C37 14 35 19 38 24 C32 21 27 24 26 30 Z"/>
    <path d="M40 30 C42 18 52 10 62 11 C57 14 55 19 58 24 C52 21 47 24 46 30 Z"/>
    <path d="M60 30 C62 18 72 10 82 11 C77 14 75 19 78 24 C72 21 67 24 66 30 Z"/>
    <path d="M-20 30 C-18 18 -8 10 2 11 C-3 14 -5 19 -2 24 C-8 21 -13 24 -14 30 Z"/>
  </g>
  <g stroke="#f6e3a4" stroke-opacity="0.55" stroke-width="0.9" fill="none">
    <path d="M-14 26 C-11 19 -6 15 0 13"/><path d="M6 26 C9 19 14 15 20 13"/><path d="M26 26 C29 19 34 15 40 13"/>
    <path d="M46 26 C49 19 54 15 60 13"/><path d="M66 26 C69 19 74 15 80 13"/>
  </g>
  <!-- groove -->
  <rect y="31" width="80" height="4" fill="#24170a"/>
  <!-- pearl beads -->
  <rect y="35" width="80" height="11" fill="#4a3110"/>
  <g fill="url(#gBead)">
    <circle cx="5" cy="40.5" r="4.4"/><circle cx="15" cy="40.5" r="4.4"/><circle cx="25" cy="40.5" r="4.4"/>
    <circle cx="35" cy="40.5" r="4.4"/><circle cx="45" cy="40.5" r="4.4"/><circle cx="55" cy="40.5" r="4.4"/>
    <circle cx="65" cy="40.5" r="4.4"/><circle cx="75" cy="40.5" r="4.4"/>
  </g>
  <!-- recessed frieze with a running scroll -->
  <rect y="46" width="80" height="18" fill="url(#gFrieze)"/>
  <path d="M0 55 C7 46 15 46 20 55 C25 64 33 64 40 55 C47 46 55 46 60 55 C65 64 73 64 80 55"
        fill="none" stroke="url(#gScroll)" stroke-width="2.6" stroke-linecap="butt"/>
  <g fill="#e9c874" opacity="0.9">
    <circle cx="10" cy="51" r="1.8"/><circle cx="30" cy="59" r="1.8"/>
    <circle cx="50" cy="51" r="1.8"/><circle cx="70" cy="59" r="1.8"/>
  </g>
  <!-- sight edge bevel and the dark lip into the painting -->
  <rect y="64" width="80" height="10" fill="url(#gSight)"/>
  <rect y="74" width="80" height="6" fill="url(#gInner)"/>
</g>`;

const cornerOrnament = `
<g id="rosette">
  <circle cx="30" cy="30" r="24" fill="url(#gBoss)" stroke="#2a1a07" stroke-width="1.5"/>
  <g fill="url(#gLeaf)" stroke="#3a2408" stroke-width="0.7">
    ${Array.from({ length: 10 }, (_, k) => `<ellipse cx="30" cy="14" rx="5" ry="10" transform="rotate(${k * 36} 30 30)"/>`).join('')}
  </g>
  <g fill="url(#gBead)">
    ${Array.from({ length: 10 }, (_, k) => `<circle cx="30" cy="5.5" r="2.4" transform="rotate(${k * 36 + 18} 30 30)"/>`).join('')}
  </g>
  <circle cx="30" cy="30" r="8.5" fill="url(#gBossC)" stroke="#2a1a07" stroke-width="1"/>
  <circle cx="27.5" cy="27" r="2.4" fill="#fff3c4" opacity="0.7"/>
  <!-- leaf sprays running along the mitre -->
  <g fill="url(#gLeaf)" stroke="#3a2408" stroke-width="0.7">
    <path d="M50 50 C52 42 60 40 66 44 C60 46 58 52 62 58 C56 58 52 56 50 50 Z"/>
    <path d="M52 52 C60 54 64 62 60 68 C58 62 52 60 46 62 C46 56 48 54 52 52 Z"/>
  </g>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
<defs>
  <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a3c12"/><stop offset="1" stop-color="#3a260b"/>
  </linearGradient>
  <linearGradient id="gLip" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c1207"/><stop offset="0.45" stop-color="#b48a3c"/><stop offset="1" stop-color="#6d4b18"/>
  </linearGradient>
  <linearGradient id="gTorus" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4e3410"/><stop offset="0.3" stop-color="#c79b45"/>
    <stop offset="0.5" stop-color="#f0d488"/><stop offset="0.75" stop-color="#9c7430"/><stop offset="1" stop-color="#3f2a0c"/>
  </linearGradient>
  <linearGradient id="gLeaf" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="#f7e29b"/><stop offset="0.45" stop-color="#c99c46"/><stop offset="1" stop-color="#6a4714"/>
  </linearGradient>
  <radialGradient id="gBead" cx="0.35" cy="0.35" r="0.7">
    <stop offset="0" stop-color="#fff0b8"/><stop offset="0.4" stop-color="#d1a650"/><stop offset="1" stop-color="#5a3c10"/>
  </radialGradient>
  <linearGradient id="gFrieze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3b280c"/><stop offset="0.5" stop-color="#7a5a22"/><stop offset="1" stop-color="#4b3310"/>
  </linearGradient>
  <linearGradient id="gScroll" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f8e3a0"/><stop offset="1" stop-color="#a7782c"/>
  </linearGradient>
  <linearGradient id="gSight" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7c5a1f"/><stop offset="0.35" stop-color="#f3d995"/><stop offset="1" stop-color="#8d6526"/>
  </linearGradient>
  <linearGradient id="gInner" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a3d12"/><stop offset="1" stop-color="#140c04"/>
  </linearGradient>
  <radialGradient id="gBoss" cx="0.4" cy="0.38" r="0.7">
    <stop offset="0" stop-color="#a77d33"/><stop offset="1" stop-color="#3a260a"/>
  </radialGradient>
  <radialGradient id="gBossC" cx="0.35" cy="0.35" r="0.75">
    <stop offset="0" stop-color="#ffefb5"/><stop offset="0.5" stop-color="#c9973f"/><stop offset="1" stop-color="#4f350d"/>
  </radialGradient>
  <clipPath id="mTop"><polygon points="0,0 80,0 80,80"/></clipPath>
  <clipPath id="mLeft"><polygon points="0,0 0,80 80,80"/></clipPath>
  <!-- age: worn gilding, grime in the recesses, red bole showing through -->
  <filter id="age" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="9" result="big"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="fine"/>
    <feColorMatrix in="big" type="matrix" values="0 0 0 0 0.10  0 0 0 0 0.07  0 0 0 0 0.02  -1.6 0 0 0 0.95" result="grime"/>
    <feComposite in="grime" in2="SourceGraphic" operator="atop" result="g1"/>
    <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.16  0 0 0 0 0.08  -6 0 0 0 2.2" result="bole"/>
    <feComposite in="bole" in2="SourceGraphic" operator="in" result="b1"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g1"/><feMergeNode in="b1"/></feMerge>
  </filter>
  ${edgeTile}
  <g id="corner">
    <rect width="80" height="80" fill="url(#gBase)"/>
    <g clip-path="url(#mTop)"><use href="#edge"/></g>
    <g clip-path="url(#mLeft)"><use href="#edge" transform="matrix(0 1 1 0 0 0)"/></g>
    <path d="M0 0 L80 80" stroke="#2a1a07" stroke-width="1" opacity="0.7"/>
    ${cornerOrnament}
  </g>
</defs>
<g filter="url(#age)">
  <use href="#corner"/>
  <use href="#corner" transform="rotate(90 120 120)"/>
  <use href="#corner" transform="rotate(180 120 120)"/>
  <use href="#corner" transform="rotate(270 120 120)"/>
  <use href="#edge" x="80"/>
  <use href="#edge" x="80" transform="rotate(90 120 120)"/>
  <use href="#edge" x="80" transform="rotate(180 120 120)"/>
  <use href="#edge" x="80" transform="rotate(270 120 120)"/>
</g>
</svg>`;

export const frameImage = `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}")`;
