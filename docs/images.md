---
title: "Core and images"
description: "Image preparation, runtime methods and CRTImage props."
---

Load, prepare and render in browser code. Rendering requires WebGL 2 and Canvas 2D; importing the module creates no context.

Examples: [JavaScript](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/vanilla.js), [React](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/react.js). Core types: [`index.d.ts`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/index.d.ts).

## Core

```js
import { createRuntime, prepareInput } from 'crt-shader';

const runtime = createRuntime();
try {
  const image = await runtime.loadImage('/artwork.png');
  const source = prepareInput(image); // native pixels, composited on black
  await runtime.render({
    source,
    output: document.querySelector('canvas'),
    preset: 'reference',
    settings: { exposure: 1.05 },
    width: 960,
    height: 540,
    sourceVersion: 0,
  });
} finally {
  runtime.dispose(); // rendered 2D output remains; retain runtime for future updates
}
```

| Export | Purpose |
| --- | --- |
| `PRESETS` | Immutable complete settings for `reference`, `clean`, `soft`, `photoSoft` |
| `resolveSettings(preset = 'reference', overrides = {})` | Complete settings copy; validates names and finite numeric overrides |
| `prepareInput(image, options = {})` | Black-backed canvas; `inputMode: 'pixel'` by default, or `'photo'` for downsampling |
| `downsamplePhoto(image, resolution)` | Progressive Canvas 2D reduction with smoothing; pass a decoded source and positive integer longest edge |
| `createRuntime(options = {})` | Scheduler and cache; call `dispose()` when finished |
| `acquireRuntime()` | Browser-only shared `{ runtime, release }` lease; release once, do not dispose the shared runtime directly |
| `CRTRenderer` | Synchronous low-level renderer for callers owning scheduling and cleanup |

`prepareInput` accepts `HTMLImageElement` or `HTMLCanvasElement`. Pixel mode preserves dimensions and ignores `inputResolution`. Photo mode defaults to `inputResolution: 96`, requires a positive integer, preserves color and never upscales. Choose the CRT preset separately.

### Runtime methods

- `loadImage(url, { crossOrigin = 'anonymous' } = {})`: returns a decoded image, deduplicates in-flight loads and caches decoded images within its budget. `crossOrigin` also accepts `'use-credentials'` or `null`.
- `render({ source, output, preset = 'reference', settings = {}, width = output.width, height = output.height, view = null, sourceVersion = 0, signal })`: resolves to `{ width, height }` in physical pixels. Dimensions must be positive integers. The newest pending request for an output wins; superseded or aborted jobs reject with `AbortError`.
- `invalidate(source)`: clears texture/output caches for that source object. Request a render afterward.
- `stats`: counters and retained-cache bytes; excludes GPU timings.
- `dispose()`: cancels queued work and frees owned resources. Safe to call again; rendering afterward fails.

After changing a canvas, increment `sourceVersion` or invalidate it. If you changed the original behind a prepared canvas, regenerate the prepared input too.

### Geometry and low-level rendering

`view` is `{ origin: [x, y], size: [width, height] }` in prepared-source pixels, with a top-left origin. Cropping retains the full input for neighboring samples. Set output dimensions explicitly; core does not derive them from `settings.aspect`.

For synchronous rendering, use `new CRTRenderer({ cacheBytes, targetBytes, sourceBytes })`, then `renderer.render(source, output, resolveSettings(...), { width, height, view, sourceVersion })`. Prepare transparent inputs against black first. Omit `sourceVersion` to refresh input each call without output caching, or supply a stable revision to enable reuse. The runtime instead defaults to revision `0`. Call `renderer.dispose()` when finished.

## React

```jsx
import { CRTImage } from 'crt-shader/react';

<CRTImage
  src="/photograph.jpg"
  alt="A mountain lake"
  inputMode="photo"
  inputResolution={96}
  width={480}
  loading="lazy"
  onError={console.error}
/>
```

Pass [scalar effect settings](/options) as numeric props to override the preset. Types: [`CRTImageProps`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/react.d.ts).

| Prop | Default | Meaning |
| --- | --- | --- |
| `src` | required | URL, decoded image element or canvas |
| `sourceVersion` | `0` | Number/string revision; change after painting new source pixels |
| `preset` | `'reference'` | Preset name |
| `inputMode` | `'pixel'` | Native pixels; `'photo'` opts into reduction |
| `inputResolution` | `96` | Photo texture's positive integer longest edge; `'auto'` is unsupported |
| `width`, `height` | source-derived | CSS pixels; omit one to preserve the calculated aspect |
| `dpr` | device DPR capped at `2` | Physical/CSS pixel ratio; explicit positive value overrides cap |
| `view` | `null` | Crop in prepared source pixels |
| `loading` | `'eager'` | `'lazy'` waits for first intersection; falls back to eager if `IntersectionObserver` is unavailable |
| `alt` | `''` | Canvas accessible label and fallback text |
| `className`, `style` | none | Canvas presentation; other DOM props are not forwarded |
| `onLoad` | none | After each completed render: `{ canvas, source, width, height }`; source is the decoded original and dimensions are physical pixels |
| `onError` | none | Load, preparation or render errors; cancellation is not reported |

Pixel layout uses `sourceWidth / (sourceHeight * aspect)`. Photo layout ignores `aspect` and preserves the original ratio even when preparation rounds dimensions. Photo crops map proportionally back to the original. Set both dimensions to choose an explicit output rectangle. Update numeric dimensions to resize the framebuffer; CSS-only resizing leaves it unchanged.

Import and server rendering do not touch the DOM or allocate GPU resources. Client effects share a runtime, including StrictMode replay. Source, revision or preparation changes regenerate input from the retained original; effect-only changes reuse it. New requests replace stale work. Unmount cancels pending rendering and releases the lease. Failures have no automatic image fallback.

## Access, color and memory

Remote images need CORS headers that permit WebGL/Canvas access, even if they display in an `<img>`. Supplied image elements must be decoded and CORS-clean.

Inputs use display-encoded RGB. Preparation composites transparency on black; output alpha is `1`. Do not apply another output gamma/encoder. Display-P3, transparent pass-through and HDR output are unsupported.

| Runtime option | Default | Budget |
| --- | --- | --- |
| `frameBudget` | `8 ms` | CPU submission time; does not bound GPU time or guarantee frame rate |
| `imageBytes` | `16 MiB` | Decoded images |
| `cacheBytes` | `32 MiB` | Finished outputs |
| `targetBytes` | `32 MiB` | Retained intermediate targets |
| `sourceBytes` | `16 MiB` | GPU source textures |

Budgets exclude mounted originals, prepared inputs, output canvases and transient buffers. Lazy loading retains images once visible; virtualize or unmount them in long feeds.

Diagnostics include `renders`, `cacheHits`, `drawCalls`, `sourceUploads`, `targetAllocations`, `cacheBytes`, `targetBytes`, `sourceBytes`, plus runtime `queued`, `contexts`, `imageBytes` and `disposed`.
