import { useCallback, useEffect, useId, useRef, useState } from 'react';
import 'photoswipe/style.css';
import './gallery.css';

let currentViewer;
let latestRequest = 0;

/**
 * Capture an existing canvas or image, at its intrinsic (not CSS) dimensions.
 * No root ref or selector is required: pass the actual HTMLCanvasElement or
 * HTMLImageElement. The caller must wait for its own renderer's ready signal.
 *
 * `render` is optional, synchronous, and called immediately before canvas
 * readback. For a non-preserved WebGL drawing buffer pass the OWNER'S complete
 * render, e.g. () => mounted.composer.render(), NOT renderer.render(scene,
 * camera) when postprocessing owns the final frame. Never resize/recreate the
 * renderer. Async preparation must finish BEFORE calling captureGalleryMedia.
 * Preserved buffers and 2D canvases do not need a render callback.
 *
 * Returns Promise<{ src, width, height, release? }>. Canvas snapshots are PNG
 * object URLs; images retain their original URL/bytes. The viewer owns release
 * once passed to open(); other consumers must call release() themselves.
 */
export async function captureGalleryMedia(media, { render } = {}) {
  if (media instanceof HTMLImageElement) {
    await media.decode();
    if (!media.naturalWidth || !media.naturalHeight) throw new Error('The image is not ready yet.');
    return { src: media.currentSrc || media.src, width: media.naturalWidth, height: media.naturalHeight };
  }
  if (!(media instanceof HTMLCanvasElement) || !media.width || !media.height) {
    throw new Error('The preview is not ready yet.');
  }
  // toBlob snapshots synchronously, before a non-preserved WebGL buffer clears.
  let width;
  let height;
  const blob = await new Promise((resolve, reject) => {
    try {
      render?.();
      ({ width, height } = media);
      media.toBlob(value => value ? resolve(value) : reject(new Error('Unable to capture this preview.')), 'image/png');
    } catch (error) { reject(error); }
  });
  const src = URL.createObjectURL(blob);
  return { src, width, height, release: () => URL.revokeObjectURL(src) };
}

function fitZoom(levels) {
  return Math.min(levels.panAreaSize.x / levels.elementSize.x, levels.panAreaSize.y / levels.elementSize.y);
}

function createViewer(PhotoSwipe, media, label) {
  const viewer = new PhotoSwipe({
    dataSource: [{ src: media.src, width: media.width, height: media.height, alt: label }],
    mainClass: 'crt-detail-viewer',
    index: 0,
    counter: false,
    arrowPrev: false,
    arrowNext: false,
    wheelToZoom: true,
    trapFocus: true,
    returnFocus: true,
    escKey: true,
    // Inspect rather than accidentally dismiss or hide the controls on touch.
    pinchToClose: false,
    closeOnVerticalDrag: false,
    bgClickAction: false,
    imageClickAction: 'zoom',
    tapAction: 'zoom',
    doubleTapAction: 'zoom',
    initialZoomLevel: fitZoom,
    secondaryZoomLevel: levels => Math.max(1, fitZoom(levels) * 2),
    maxZoomLevel: levels => Math.max(16, fitZoom(levels) * 4),
    padding: { top: 72, bottom: 88, left: 16, right: 16 },
    bgOpacity: 1,
    showHideAnimationType: 'none',
    zoomAnimationDuration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
    closeTitle: 'Close inspector (Escape)',
    zoomTitle: 'Toggle zoom (Z)',
    errorMsg: 'Unable to load this preview. Close the inspector and try again.',
  });
  viewer.on('uiRegister', () => {
    viewer.ui.registerElement({
      name: 'detail-size', order: 5,
      onInit(element, pswp) {
        const update = () => {
          const zoom = pswp.currSlide?.currZoomLevel ?? 1;
          element.textContent = `${media.width} × ${media.height} · ${Math.round(zoom * 100)}%`;
        };
        pswp.on('zoomPanUpdate', update);
        update();
      },
    });
    viewer.ui.registerElement({
      name: 'fit', order: 7, isButton: true, html: 'Fit',
      title: 'Reset pan and fit image',
      onClick: () => viewer.currSlide.zoomTo(viewer.currSlide.zoomLevels.initial),
    });
    viewer.ui.registerElement({
      name: 'native', order: 8, isButton: true, html: '1:1',
      title: 'Reset to native size (one image pixel per CSS pixel)',
      onClick: () => {
        const slide = viewer.currSlide;
        slide.zoomTo(1);
        slide.panTo(slide.bounds.center.x, slide.bounds.center.y);
      },
    });
    viewer.ui.registerElement({
      name: 'detail-caption', appendTo: 'root',
      onInit(element) {
        const title = document.createElement('div');
        title.textContent = label;
        const hint = document.createElement('div');
        hint.className = 'crt-detail-hint';
        hint.textContent = 'Scroll or pinch to zoom · Drag or use arrow keys to pan';
        element.append(title, hint);
      },
    });
  });
  viewer.on('afterInit', () => {
    viewer.element.setAttribute('aria-label', `${label} — image inspector`);
    viewer.element.setAttribute('aria-modal', 'true');
  });
  return viewer;
}

/**
 * `open({ trigger, label, capture })` accepts the initiating button and a
 * callback returning captureGalleryMedia's descriptor. Reject while loading.
 * PhotoSwipe owns gestures, keyboard and focus restoration; this hook owns
 * capture cancellation, the single open viewer and snapshot cleanup.
 */
export function useGalleryViewer() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  useEffect(() => () => {
    if (request.current) {
      request.current.cancelled = true;
      request.current.viewer?.destroy();
    }
  }, []);

  const open = useCallback(async ({ trigger, label, capture }) => {
    if (request.current && !request.current.done) return;
    const pending = { id: ++latestRequest, cancelled: false, done: false };
    request.current = pending;
    setBusy(true);
    setError('');
    let media;
    try {
      media = await capture();
      // Decode before opening: failed/empty snapshots never become blank dialogs.
      const image = new Image();
      image.src = media.src;
      const [{ default: PhotoSwipe }] = await Promise.all([import('photoswipe'), image.decode()]);
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('The preview is empty.');
      if (pending.cancelled || pending.id !== latestRequest || !trigger.isConnected) {
        media.release?.();
        return;
      }
      currentViewer?.destroy();
      trigger.focus({ preventScroll: true });
      const viewer = createViewer(PhotoSwipe, media, label);
      pending.viewer = currentViewer = viewer;
      viewer.on('destroy', () => {
        media.release?.();
        if (currentViewer === viewer) currentViewer = undefined;
      });
      viewer.init();
    } catch (failure) {
      pending.viewer?.destroy();
      media?.release?.();
      if (!pending.cancelled) setError(`Unable to inspect: ${failure.message}`);
    } finally {
      pending.done = true;
      if (!pending.cancelled) setBusy(false);
    }
  }, []);
  return { open, busy, error };
}

/** Drop-in .crt-surface button. Children must not contain interactive controls. */
export function InspectableSurface({ label, capture, children, className = '', style }) {
  const { open, busy, error } = useGalleryViewer();
  const statusId = useId();
  return <>
    <button type="button" className={`crt-surface crt-inspect ${className}`.trim()} style={style}
      aria-label={`Inspect ${label}`} aria-haspopup="dialog" aria-busy={busy}
      aria-describedby={busy || error ? statusId : undefined}
      onClick={event => open({ trigger: event.currentTarget, label, capture })}>
      {children}
    </button>
    {busy && <span id={statusId} className="crt-inspect-status" role="status">Preparing preview…</span>}
    {error && <span id={statusId} className="crt-inspect-status" role="alert">{error}</span>}
  </>;
}

export function InspectHint() {
  return <span className="crt-inspect-hint">Click to inspect</span>;
}
