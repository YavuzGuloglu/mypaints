import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { works, SCENE_INDEX } from '../data/works';
import { bakeCanvasTexture, bakeNoiseTexture } from './bake';
import { fragmentShader, vertexShader } from './shader';
import { journey, segment } from './journey';

interface Props {
  lowPower: boolean;
  onContextLost: () => void;
  onShaderError: () => void;
}

const loader = new THREE.TextureLoader();
const blank = new THREE.DataTexture(new Uint8Array([200, 190, 170, 255]), 1, 1);
blank.needsUpdate = true;

/** Loads any real photos set in works.ts; slots without an image use the shader scene. */
function usePhotos() {
  const ref = useRef<(THREE.Texture | null)[]>(works.map(() => null));
  useEffect(() => {
    works.forEach((w, i) => {
      if (!w.image) return;
      loader.load(w.image, (tex) => {
        tex.colorSpace = THREE.NoColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 4;
        ref.current[i] = tex;
      });
    });
    return () => ref.current.forEach((t) => t?.dispose());
  }, []);
  return ref;
}

function Painting({ lowPower }: { lowPower: boolean }) {
  const photos = usePhotos();
  const { size, setDpr } = useThree();
  const textures = useMemo(() => ({ noise: bakeNoiseTexture(), canvas: bakeCanvasTexture() }), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 12 },
          uAspect: { value: 1.6 },
          uNoise: { value: textures.noise },
          uCanvas: { value: textures.canvas },
          uSceneA: { value: 0 },
          uSceneB: { value: 1 },
          uZA: { value: 0 },
          uZB: { value: 0 },
          uMix: { value: 0 },
          uTexA: { value: blank },
          uTexB: { value: blank },
          uHasA: { value: 0 },
          uHasB: { value: 0 },
          uImgAspA: { value: 1 },
          uImgAspB: { value: 1 },
          uFitA: { value: 1 },
          uFitB: { value: 1 },
        },
      }),
    [textures],
  );

  useEffect(
    () => () => {
      material.dispose();
      textures.noise.dispose();
      textures.canvas.dispose();
    },
    [material, textures],
  );

  // Adaptive resolution: if frames are slow, drop the pixel ratio once.
  const perf = useRef({ acc: 0, n: 0, dropped: false });

  useFrame((_, dt) => {
    const u = material.uniforms;
    if (!journey.reduced) u.uTime.value += Math.min(dt, 0.1);
    u.uAspect.value = size.width / Math.max(1, size.height);

    const { i, f, mix, next } = segment(journey.g);
    const slot = (k: number, which: 'A' | 'B', z: number) => {
      const w = works[k];
      const tex = photos.current[k];
      u[`uScene${which}`].value = SCENE_INDEX[w.scene];
      u[`uZ${which}`].value = z;
      u[`uHas${which}`].value = tex ? 1 : 0;
      u[`uTex${which}`].value = tex ?? blank;
      if (tex) {
        const img = tex.image as { width: number; height: number };
        u[`uImgAsp${which}`].value = img.width / img.height;
      }
      u[`uFit${which}`].value = w.fit === 'contain' ? 0 : 1;
    };
    slot(i, 'A', f);
    slot(next, 'B', (f - 1) * 0.55);
    u.uMix.value = next === i ? 0 : mix;

    const p = perf.current;
    if (!p.dropped) {
      p.acc += dt;
      p.n++;
      if (p.n === 90) {
        if (p.acc / p.n > 1 / 38) {
          setDpr(lowPower ? 0.9 : 1);
          p.dropped = true;
        }
        p.acc = 0;
        p.n = 0;
      }
    }
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function PaintingCanvas({ lowPower, onContextLost, onShaderError }: Props) {
  return (
    <Canvas
      className="painting-canvas"
      dpr={lowPower ? [1, 1.25] : [1, 1.6]}
      flat
      linear
      orthographic
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: lowPower ? 'default' : 'high-performance',
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        // A shader that fails to compile on some GPU should not leave a black hole: fall back.
        gl.debug.onShaderError = () => onShaderError();
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault();
            onContextLost();
          },
          { once: true },
        );
      }}
    >
      <Painting lowPower={lowPower} />
    </Canvas>
  );
}
