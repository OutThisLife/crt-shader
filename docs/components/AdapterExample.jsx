import { useEffect, useRef, useState } from 'react';
import { createPattern, WIDTH, HEIGHT } from '../../examples/src/pattern.js';
import { captureGalleryMedia, InspectableSurface, InspectHint } from './GalleryViewer.jsx';

const adapters = {
  vanilla: () => import('../../examples/src/vanilla.js'),
  react: () => import('../../examples/src/react.js'),
  three: () => import('../../examples/src/three.js'),
  postprocessing: () => import('../../examples/src/postprocessing.js'),
  r3f: () => import('../../examples/src/r3f.js'),
};

export default function AdapterExample({ integration = 'vanilla' }) {
  const root = useRef(null);
  const sourceFrame = useRef(null);
  const outputFrame = useRef(null);
  const mountedAdapter = useRef(null);
  const [error, setError] = useState('');
  const [inputSize, setInputSize] = useState('');

  useEffect(() => {
    let active = true;
    let mounted;
    const sourceHost = sourceFrame.current;
    const outputHost = outputFrame.current;
    const element = root.current;
    const source = createPattern();
    delete element.dataset.ready;
    setError('');
    setInputSize(`${source.width} × ${source.height}`);
    sourceHost.replaceChildren(source);
    const resize = new ResizeObserver(entries => {
      for (const { target, contentRect } of entries) {
        target.style.setProperty('--crt-scale', Math.min(1, contentRect.width / WIDTH));
      }
    });
    for (const surface of element.querySelectorAll('.crt-surface')) resize.observe(surface);
    async function start() {
      try {
        if (!adapters[integration]) throw new Error(`Unknown integration: ${integration}`);
        const { mount } = await adapters[integration]();
        if (!active) return;
        mounted = await mount({ source, host: outputHost, preset: 'reference', params: new URLSearchParams() });
        if (!active) { mounted.dispose(); return; }
        mountedAdapter.current = mounted;
        element.dataset.ready = 'true';
      } catch (failure) { if (active) setError(failure.message); }
    }
    void start();
    return () => {
      active = false;
      mountedAdapter.current = null;
      resize.disconnect();
      mounted?.dispose();
      sourceHost.replaceChildren();
      outputHost.replaceChildren();
    };
  }, [integration]);

  const captureOutput = () => {
    const mounted = mountedAdapter.current;
    if (!mounted) throw new Error(error || 'This preview is still loading. Try again in a moment.');
    return captureGalleryMedia(mounted.canvas, {
      // Render the complete existing pipeline, never bypass its final CRT pass.
      // R3F resolves after its ready frame and preserves its drawing buffer.
      render: mounted.composer ? () => mounted.composer.render() : undefined,
    });
  };

  return <div ref={root} className="crt-adapter not-content" data-integration={integration}
    style={{ '--crt-width': `${WIDTH}px`, '--crt-height': `${HEIGHT}px`, '--crt-ratio': `${WIDTH} / ${HEIGHT}` }}>
    <p className="crt-caption"><InspectHint /></p>
    <div className="crt-panels">
      <figure><figcaption>Source pixels</figcaption>
        <InspectableSurface label={`${integration}: source pixels`} capture={() => captureGalleryMedia(sourceFrame.current?.querySelector('canvas'))}>
          <span ref={sourceFrame} className="crt-render-frame crt-adapter-source" />
        </InspectableSurface>
      </figure>
      <figure><figcaption>{integration} · Reference</figcaption>
        <InspectableSurface label={`${integration}: CRT output`} capture={captureOutput}>
          <span ref={outputFrame} className="crt-render-frame" />
        </InspectableSurface>
      </figure>
    </div>
    <p className="crt-caption">{inputSize} source · {WIDTH} × {HEIGHT} output · DPR 1</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
