import { createElement as h, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { HalfFloatType, NoToneMapping, SRGBColorSpace } from 'three';
import { ToneMappingMode } from 'postprocessing';
import { CRT } from 'crt-shader/r3f';
import { createScene } from './scene.js';

// Runs after the composer's priority-1 frame, so readiness means pixels exist.
function Ready({ crt, onReady }) {
  const reported = useRef(false);
  useFrame(({ gl }) => {
    if (!reported.current && crt.current?.stats.renders > 0) {
      reported.current = true;
      onReady(gl, crt.current);
    }
  }, 2);
  return null;
}

export function mount({ source, host, preset }) {
  const content = createScene(source);
  // Preserve the shared scene's world-space frustum; Fiber otherwise uses CSS pixels.
  content.camera.manual = true;
  const root = createRoot(host);
  const crt = { current: null };
  return new Promise(resolve => {
    root.render(h(Canvas, {
      scene: content.scene, camera: content.camera, dpr: 1, frameloop: 'demand', flat: true,
      gl: { alpha: false, antialias: false, preserveDrawingBuffer: true },
      style: { width: '100%', height: '100%' },
      onCreated: ({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = NoToneMapping;
        gl.setClearColor(0x000000, 1);
        gl.domElement.setAttribute('aria-label', 'R3F CRT procedural scene');
      },
    },
    h(EffectComposer, { multisampling: 0, frameBufferType: HalfFloatType },
      h(ToneMapping, { mode: ToneMappingMode.LINEAR }),
      h(CRT, { ref: crt, preset, inputResolution: source.width })),
    h(Ready, { crt, onReady: (renderer, pass) => resolve({
      canvas: renderer.domElement, renderer, crt: pass,
      dispose() { root.unmount(); content.dispose(); },
    }) })));
  });
}
