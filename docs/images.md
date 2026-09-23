---
title: "Core and images"
description: "Prepare image inputs, render with the shared runtime, and manage color, caching, and lifecycle."
---

Import the browser-independent module without creating a context; load images, prepare inputs and render only in browser/client code. Client rendering needs WebGL 2 and Canvas 2D. See the [core image/canvas example](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/vanilla.js) and [React image example](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/react.js) for complete applications and [`index.d.ts`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/index.d.ts) for core types.

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

| Export | Contract |
| --- | --- |
| `PRESETS` | Immutable complete settings for `reference`, `clean`, `soft`, `photoSoft` |
| `resolveSettings(preset = 'reference', overrides = {})` | Complete settings copy; validates names and finite numeric overrides |
| `prepareInput(image, options = {})` | Black-backed canvas; `inputMode: 'pixel'` by default, or `'photo'` for downsampling |
| `downsamplePhoto(image, resolution)` | Progressive Canvas 2D reduction with smoothing; pass a decoded source and positive integer longest edge |
| `createRuntime(options = {})` | Owned scheduler/cache; call `dispose()` when finished |
| `acquireRuntime()` | Browser-only shared `{ runtime, release }` lease; release once, do not dispose the shared runtime directly |
| `CRTRenderer` | Synchronous low-level renderer for callers owning scheduling and cleanup |

`prepareInput` accepts `HTMLImageElement` or `HTMLCanvasElement`. Pixel mode preserves dimensions and ignores `inputResolution`. Photo mode defaults to `inputResolution: 96`, validates a positive integer, preserves color and never upscales. It uploads a genuinely reduced texture, not an enlarged mosaic. Preparation does not select a CRT preset.

### Runtime methods

- `loadImage(url, { crossOrigin = 'anonymous' } = {})`: decoded image, deduplicated in-flight loads and bounded decoded cache. `crossOrigin` also accepts `'use-credentials'` or `null`.
- `render({ source, output, preset = 'reference', settings = {}, width = output.width, height = output.height, view = null, sourceVersion = 0, signal })`: promise of `{ width, height }` in physical pixels. Width/height must be positive integers. Pending requests for the same output are latest-wins; superseded or aborted jobs reject with `AbortError`.
- `invalidate(source)`: invalidate texture/output caches for that exact source object, then request another render.
- `stats`: counters and retained-cache byte counts, not GPU timings.
- `dispose()`: cancel queued work and free owned resources; idempotent, but the runtime cannot render afterward.

For a mutated canvas, increment `sourceVersion` or invalidate that source. If you mutate the original image/canvas behind a separately prepared canvas, regenerate the prepared input too. Caching cannot detect pixel changes from object identity alone.

### Geometry and low-level rendering

`view` is `{ origin: [x, y], size: [width, height] }` in prepared source pixels, with a top-left origin. The pipeline retains the full input, including neighbors outside the view. This is framing, not effect strength. Core output dimensions are explicit; core does not derive an output aspect ratio from `settings.aspect`.

The synchronous path is `new CRTRenderer({ cacheBytes, targetBytes, sourceBytes })`, then `renderer.render(source, output, resolveSettings(...), { width, height, view, sourceVersion })`. Prepare transparent inputs against black first. Omitting `sourceVersion` here refreshes mutable input on every call and skips output caching; supplying a stable revision enables reuse. This differs from the runtime's default revision `0`. Call `renderer.dispose()` when finished.

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

[`CRTImageProps`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/react.d.ts) defines the supported props. Every [scalar effect setting](/options) is a direct numeric prop overriding the preset.

| Prop | Default | Meaning |
| --- | --- | --- |
| `src` | required | URL, decoded image element or canvas |
| `sourceVersion` | `0` | Number/string revision; change after painting new source pixels |
| `preset` | `'reference'` | Frozen preset name |
| `inputMode` | `'pixel'` | Native pixels; `'photo'` opts into reduction |
| `inputResolution` | `96` | Photo texture's positive integer longest edge; no `'auto'` image option |
| `width`, `height` | source-derived | CSS pixels; omit one to preserve the calculated aspect |
| `dpr` | device DPR capped at `2` | Physical/CSS pixel ratio; explicit positive value overrides cap |
| `view` | `null` | Crop in prepared source pixels |
| `loading` | `'eager'` | `'lazy'` waits for first intersection; falls back to eager if `IntersectionObserver` is unavailable |
| `alt` | `''` | Canvas accessible label and fallback text |
| `className`, `style` | none | Canvas presentation, not arbitrary DOM-prop forwarding |
| `onLoad` | none | After each completed render: `{ canvas, source, width, height }`; source is the decoded original and dimensions are physical pixels |
| `onError` | none | Load, preparation or render errors; cancellation is not reported |

Pixel layout uses `sourceWidth / (sourceHeight * aspect)`. Photo layout preserves the original aspect and ignores `aspect`; rounded preparation dimensions do not stretch the image. Photo crops map proportionally from the prepared texture back to the original. Supplying both width and height chooses an explicit output rectangle. CSS-only resizing does not resize the GPU framebuffer: update numeric dimensions when the rendered resolution should change.

Import and server rendering do not touch the DOM or allocate GPU resources. Client effects acquire one shared runtime across mounted components, including StrictMode replay. Source/revision/preprocessing changes regenerate input from the retained original; effect-only changes reuse it. New requests supersede stale work; unmount cancels pending rendering and releases the lease. No automatic unprocessed-image fallback is inserted on failure.

## Access, color and memory

Remote URLs need valid image-server CORS headers. Successful display in an ordinary `<img>` does not prove WebGL/Canvas access. Supplied image elements must already be decoded and CORS-clean. Browser restrictions cannot be bypassed by the library.

Inputs use display-encoded RGB. Preparation composites transparency on black; reconstruction produces alpha `1`. Do not apply an extra output gamma/encoder. Display-P3, transparent pass-through and HDR image output are not supported.

Runtime defaults are `frameBudget: 8` milliseconds of CPU submission, `imageBytes: 16 MiB`, `cacheBytes: 32 MiB` of finished outputs, `targetBytes: 32 MiB` of retained intermediate targets, and `sourceBytes: 16 MiB` of GPU source textures. The CPU budget is not a frame-rate or GPU-time guarantee.

Budgets exclude mounted originals/prepared inputs/output canvases and transient working buffers. Lazy initialization does not evict images that were once visible; use virtualization/unmounting for long feeds. Diagnostics include `renders`, `cacheHits`, `drawCalls`, `sourceUploads`, `targetAllocations`, `cacheBytes`, `targetBytes`, `sourceBytes`, plus runtime `queued`, `contexts`, `imageBytes` and `disposed`.
