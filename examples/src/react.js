import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CRTImage } from 'crt-shader/react';
import { WIDTH, HEIGHT, DPR } from './pattern.js';

export function mount({ source, host, preset }) {
  const root = createRoot(host);
  return new Promise((resolve, reject) => {
    root.render(createElement(StrictMode, null, createElement(CRTImage, {
      src: source, preset, width: WIDTH, height: HEIGHT, dpr: DPR,
      alt: 'CRT procedural test pattern', style: { width: '100%', height: '100%' },
      onLoad: ({ canvas }) => resolve({ canvas, dispose: () => root.unmount() }),
      onError: reject,
    })));
  });
}
