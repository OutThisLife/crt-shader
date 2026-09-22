'use client';

import { createElement, useEffect, useRef, useState } from 'react';
import { PRESETS, acquireRuntime, prepareInput, resolveSettings } from './core.js';

const settingKeys = Object.keys(PRESETS.reference);

/** A still-image CRT canvas. GPU work is shared and starts only after mount. */
export function CRTImage({
  src, sourceVersion = 0, preset = 'reference', inputMode = 'pixel', inputResolution = 96,
  width, height, dpr, view = null, loading = 'eager', alt = '', className, style, onLoad, onError, ...overrides
}) {
  const canvasRef = useRef(null);
  const callbacks = useRef({ onLoad, onError });
  const preparedRef = useRef(null);
  const [size, setSize] = useState(null);
  const [visible, setVisible] = useState(false);
  const ready = loading !== 'lazy' || visible;
  const viewKey = view ? JSON.stringify({ origin: view.origin, size: view.size }) : null;
  // Only scalar setting values trigger work, not a new props or callback object.
  const settingsKey = JSON.stringify(Object.fromEntries(settingKeys
    .filter(key => overrides[key] !== undefined).map(key => [key, overrides[key]])));

  useEffect(() => { callbacks.current = { onLoad, onError }; });

  useEffect(() => {
    if (loading !== 'lazy' || visible) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        setVisible(true);
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [loading, visible]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const output = canvasRef.current;
    let lease;
    async function render() {
      try {
        lease = acquireRuntime();
        const { runtime } = lease;
        let prepared = preparedRef.current;
        const reusable = prepared && prepared.src === src && prepared.sourceVersion === sourceVersion &&
          prepared.inputMode === inputMode && prepared.inputResolution === inputResolution;
        const original = reusable ? prepared.original : typeof src === 'string' ? await runtime.loadImage(src) : src;
        if (controller.signal.aborted) return;
        const settings = resolveSettings(preset, JSON.parse(settingsKey));
        const originalWidth = original.naturalWidth || original.width;
        const originalHeight = original.naturalHeight || original.height;
        if (!reusable) {
          prepared = { src, original, sourceVersion, inputMode, inputResolution,
            source: prepareInput(original, { inputMode, inputResolution }) };
          preparedRef.current = prepared;
        }
        const crop = viewKey ? JSON.parse(viewKey) : null;
        const viewWidth = crop ? crop.size[0] * originalWidth / prepared.source.width : originalWidth;
        const viewHeight = crop ? crop.size[1] * originalHeight / prepared.source.height : originalHeight;
        const ratio = viewWidth / (viewHeight * (inputMode === 'photo' ? 1 : settings.aspect));
        const cssWidth = width ?? (height === undefined ? viewWidth : height * ratio);
        const cssHeight = height ?? cssWidth / ratio;
        const scale = dpr ?? Math.min(2, window.devicePixelRatio || 1);
        if (![cssWidth, cssHeight, scale].every(value => Number.isFinite(value) && value > 0)) {
          throw new RangeError('CRTImage dimensions, aspect and dpr must be positive finite numbers.');
        }
        const result = await runtime.render({
          source: prepared.source, sourceVersion, output, preset, settings, view: crop,
          width: Math.max(1, Math.round(cssWidth * scale)),
          height: Math.max(1, Math.round(cssHeight * scale)), signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSize({ width: cssWidth, height: cssHeight });
        callbacks.current.onLoad?.({ ...result, canvas: output, source: original });
      } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError') callbacks.current.onError?.(error);
      }
    }
    void render();
    return () => { controller.abort(); lease?.release(); };
  }, [ready, src, sourceVersion, preset, inputMode, inputResolution, width, height, dpr, settingsKey, viewKey]);

  return createElement('canvas', {
    ref: canvasRef, role: 'img', 'aria-label': alt, className,
    style: { display: 'block', ...style, width: width ?? style?.width ?? size?.width, height: height ?? style?.height ?? size?.height },
  }, alt);
}
