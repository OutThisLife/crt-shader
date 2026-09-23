import { useCallback, useEffect, useRef, useState } from 'react';
import { captureGalleryMedia, InspectableSurface, InspectHint } from './GalleryViewer.jsx';

const recipes = {
  vanilla: () => import('../../examples/quickstart/vanilla.js'),
  react: () => import('../../examples/quickstart/react.jsx'),
  three: () => import('../../examples/quickstart/three.js'),
  postprocessing: () => import('../../examples/quickstart/postprocessing.js'),
  r3f: () => import('../../examples/quickstart/r3f.jsx'),
};

export default function QuickstartPreview({ integration, label }) {
  const root = useRef(null);
  const host = useRef(null);
  const crt = useRef(null);
  const [visible, setVisible] = useState(false);
  const [Recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');
  const markReady = useCallback(() => {
    if (root.current) root.current.dataset.ready = 'true';
  }, []);
  const reportError = useCallback(failure => setError(failure.message), []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = root.current;
    const target = host.current;
    let active = true;
    let mounted;
    let frame;
    element.dataset.ready = 'false';
    setRecipe(null);
    if (!visible) return;
    setError('');

    async function start() {
      try {
        const recipe = await recipes[integration]();
        if (!active) return;
        if (recipe.mount) {
          mounted = recipe.mount(target);
          await mounted.ready;
          if (active) markReady();
        } else {
          setRecipe(() => recipe.default);
          if (integration === 'r3f') {
            // A mounted Canvas is not ready until its CRT pass has rendered.
            const check = () => {
              if (!active) return;
              if (crt.current?.stats.renders > 0) markReady();
              else frame = requestAnimationFrame(check);
            };
            frame = requestAnimationFrame(check);
          }
        }
      } catch (failure) {
        if (active) reportError(failure);
      }
    }
    void start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      mounted?.dispose();
      element.dataset.ready = 'false';
    };
  }, [integration, visible, markReady, reportError]);

  const capture = () => {
    if (root.current?.dataset.ready !== 'true') {
      throw new Error(error || 'This preview is still loading.');
    }
    return captureGalleryMedia(host.current?.querySelector('canvas'));
  };

  return (
    <div ref={root} className="crt-quickstart not-content" data-quickstart={integration} data-ready="false">
      <p className="crt-caption">Live example · <InspectHint /></p>
      <InspectableSurface label={`${label}: CRT example`} capture={capture}>
        <div ref={host} className="crt-quickstart-frame">
          {visible && Recipe && <Recipe onLoad={markReady} onError={reportError} crtRef={crt}
            onCreated={({ gl }) => gl.domElement.setAttribute('aria-label', 'CRT torus knot')} />}
        </div>
        {!error && <p className="crt-preview-loading" role="status">Loading preview…</p>}
      </InspectableSurface>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
