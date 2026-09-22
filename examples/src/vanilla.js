import { createRuntime, prepareInput } from 'crt-shader';
import { WIDTH, HEIGHT } from './pattern.js';

export async function mount({ source, host, preset, params }) {
  const runtime = createRuntime();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'CRT procedural test pattern');
  host.append(canvas);
  // Both inputs are local original artwork. Real URLs must allow anonymous CORS.
  const input = params.get('input') === 'image'
    ? await runtime.loadImage(source.toDataURL('image/png')) : source;
  await runtime.render({ source: prepareInput(input), output: canvas,
    preset, width: WIDTH, height: HEIGHT, sourceVersion: 0 });
  return { canvas, runtime, dispose: () => runtime.dispose() };
}
