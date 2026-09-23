---
title: "Scene adapter contracts"
description: "Color, resolution, options and lifecycle for Three.js scene adapters."
---

Both `CRTPass` adapters require WebGL 2 and use your existing `WebGLRenderer`. They own their targets and materials. Input reduction stays on the GPU without readbacks, CPU uploads or Canvas 2D copies.

Choose the adapter for your composer; their base classes, buffer order and color handling differ. Examples: [native Three](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/three.js), [pmndrs](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/postprocessing.js), [R3F](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/r3f.js). Shared implementation: [`three-pipeline.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/three-pipeline.js).

## Native Three.js

```js
import { SRGBColorSpace } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CRTPass } from 'crt-shader/three';

renderer.outputColorSpace = SRGBColorSpace;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass()); // tone map and encode before CRT
const crt = new CRTPass({ preset: 'reference', inputResolution: 'auto' });
composer.addPass(crt); // last
// Application loop: composer.render(delta).
// Resize renderer and composer together; the composer calls setSize.
// On removal: composer.removePass(crt); crt.dispose().
```

This adapter expects tone-mapped, display-encoded RGB from `OutputPass` in an untagged/linear render target. An sRGB-tagged target would decode those stored values incorrectly. Screen and offscreen output are display-encoded; do not tone-map or sRGB-encode after CRT.

See [`three.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/three.js) and [types](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/three.d.ts). Its composer render signature is `(renderer, writeBuffer, readBuffer, deltaTime, maskActive)`.

## pmndrs postprocessing

Import `CRTPass` from `crt-shader/postprocessing` and add it last, after the `EffectPass` containing `ToneMappingEffect`. Put scene/HDR effects before tone mapping. Prefer half-float composer buffers.

Input must be tone-mapped linear RGB. The adapter sRGB-encodes it before reduction and reconstruction. Screen output is display-encoded; offscreen output is decoded to tone-mapped linear RGB for a final pmndrs `CopyPass` to encode once. Do not treat the output as scene-referred HDR or tone-map it again.

This adapter subclasses pmndrs `Pass` with render signature `(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest)`. The composer calls `initialize(renderer, alpha, frameBufferType)` to allocate pipeline objects. See [`postprocessing.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/postprocessing.js) and [types](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/postprocessing.d.ts).

## React Three Fiber

```jsx
import { Canvas } from '@react-three/fiber';
import { EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { CRT } from 'crt-shader/r3f';

<Canvas flat>
  {/* Scene objects; composite against black */}
  <EffectComposer>
    <ToneMapping />
    <CRT preset="reference" inputResolution="auto" />
  </EffectComposer>
</Canvas>
```

`<CRT>` is a dedicated pmndrs pass with the options below. It cannot be merged as an `Effect` or used as a material. [`r3f.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/r3f.js) reuses the pass across prop updates, invalidates demand-mode rendering and handles disposal through StrictMode replay. Construction allocates no GPU resources.

The `ref` exposes the pmndrs `CRTPass`. Removing a prop override restores its preset value. After `ref.current.setOptions()` in a demand-mode scene, call Fiber's `invalidate()`; subsequent React renders reapply props. Do not dispose a mounted `<CRT>`.

Use the peer versions in [the package manifest](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/package.json). Fiber 9 needs React 19. Keep one copy of `three`, `react`, `react-dom` and `postprocessing`; duplicate pmndrs copies break `instanceof Pass` checks. Deduplicate linked workspaces in your bundler if needed.

## Input resolution and modes

`inputResolution: 'auto'` reduces the scene input by default.

| Option | Default | Meaning |
| --- | --- | --- |
| `preset` | `'reference'` | `reference`, `clean`, `soft`, `photoSoft` |
| `inputResolution` | `'auto'` | Positive integer longest edge, or the CSS-size policy below |
| `mode` | `'crt'` | Reconstruction; `'pixelated'` inspects the prepared input; `'original'` bypasses both preparation and CRT |
| [Scalar settings](/options) | preset values | Direct numeric options/props; `aspect` does not stretch scene geometry |

Auto selects `max(32, ceil((CSSLongestEdge / 384 * 32) / 8) * 8)`, clamped to native input dimensions. It uses the renderer's logical CSS size, excluding DPR. The other edge is rounded proportionally; the displayed rectangle is unchanged.

### Source pixels

To keep native resolution, set `inputResolution` to a positive integer at least as large as the incoming render buffer's longest edge. Use physical drawing-buffer dimensions for a full-canvas composer and account for custom composer scaling. Update after resize or DPR changes. Neither `'source'` nor `'native'` is supported. A GPU preparation copy still applies source quantization/filtering without reduction.

`mode: 'pixelated'` enlarges prepared input with nearest sampling. `mode: 'original'` uses the full-resolution scene with the adapter's color handling and opaque alpha. Keep the pass enabled for bypass; disabling a terminal pmndrs pass can leave nothing rendering to screen.

`crt.setOptions(partial)` patches options and returns the pass. `undefined` clears an override. Preset changes preserve numeric overrides; mode changes preserve settings. Unknown keys, invalid modes and non-positive/non-integer fixed resolutions are rejected.

`inputSize` reports the last prepared dimensions, or original dimensions in original mode. `stats` includes it plus physical `outputSize`, cumulative `renders`, `drawCalls`, `targetAllocations`, current `targets`, last-frame `preparationPasses`, `floatTargets` (`null` before initialization), and `disposed`. It does not measure FPS or GPU time.

## Color, alpha and ownership

Preparation uses RGBA8 targets. Reconstruction uses RGBA16F when `EXT_color_buffer_float` is available; RGBA8 fallback can clip highlights. Unused preparation levels are released; targets and materials are reused and resized.

Clear/composite the scene against black before CRT. Input RGB is treated as already composited; alpha is not multiplied again. All modes write alpha `1` across the full composer rectangle. Transparent pass-through, Display-P3/wide-gamut output, XR stereo/multiview and composer stencil masks are unsupported.

Passes preserve your render target, viewport/scissor, auto-clear and XR enable state. They do not dispose your renderer, buffers or input textures. Remove manually managed passes from the composer and call `dispose()` when finished. Repeated disposal is safe; rendering afterward fails. `<CRT>` handles its own disposal.
