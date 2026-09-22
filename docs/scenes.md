# Scene adapters

Both `CRTPass` adapters render through the caller's existing Three.js `WebGLRenderer`. They allocate their own targets/materials, not a second context or Canvas 2D copy path. Input reduction stays on the GPU; there are no pixel readbacks or CPU image uploads in this pipeline. WebGL 2 is required.

The adapters have different composer base classes, buffer argument order and color contracts. Import the one for your composer. Complete applications: [native Three](../examples/src/three.js), [pmndrs](../examples/src/postprocessing.js) and [R3F](../examples/src/r3f.js). Shared implementation is [`three-pipeline.js`](../packages/crt-shader/three-pipeline.js).

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

This adapter expects tone-mapped, display-encoded RGB from `OutputPass`, stored as raw values in an untagged/linear render target. It emits display-encoded RGB to both screen and offscreen targets. Do not add another tone mapper or sRGB encoder after CRT. A custom sRGB-tagged target that automatically decodes those stored values changes the contract.

See [`three.js`](../packages/crt-shader/three.js) and [types](../packages/crt-shader/three.d.ts). Its composer render signature is `(renderer, writeBuffer, readBuffer, deltaTime, maskActive)`.

## pmndrs postprocessing

Import `CRTPass` from `crt-shader/postprocessing` and add it after the `EffectPass` containing your `ToneMappingEffect`. Prefer half-float composer buffers for the linear path. CRT should be the terminal pass; scene/HDR effects belong before tone mapping and CRT.

The adapter expects **tone-mapped linear RGB**, sRGB-encodes once before input reduction, and runs the frozen stages on those display-encoded pixels. Screen output is already display-encoded. Offscreen output is explicitly decoded back to tone-mapped linear RGB so a final pmndrs `CopyPass` can encode once. This does not make the output scene-referred HDR or permit another tone-mapping stage.

See [`postprocessing.js`](../packages/crt-shader/postprocessing.js) and [types](../packages/crt-shader/postprocessing.d.ts). It subclasses pmndrs `Pass`; its render signature is `(renderer, inputBuffer, outputBuffer, deltaTime, stencilTest)`. The composer calls `initialize(renderer, alpha, frameBufferType)` to allocate reusable pipeline objects.

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

`<CRT>` is a dedicated pmndrs pass, not a mergeable `Effect` or a material. It uses the same options below. [`r3f.js`](../packages/crt-shader/r3f.js) retains pass identity across prop updates, invalidates demand-mode rendering, and defers final disposal through StrictMode replay. Construction itself is GPU-lazy.

The `ref` exposes the pmndrs `CRTPass`. Props are authoritative: removing an override restores its preset value. If you call `ref.current.setOptions()` directly in a demand-mode scene, call Fiber's `invalidate()` yourself; subsequent React renders reapply the props. Do not dispose a mounted `<CRT>` manually.

Install compatible peers from [the package manifest](../packages/crt-shader/package.json). Fiber 9 needs React 19. Keep one copy of `three`, `react`, `react-dom` and `postprocessing`; duplicate pmndrs copies break `instanceof Pass` checks. Linked workspaces may need bundler deduplication.

## Input resolution and modes

**`inputResolution: 'auto'` downsamples by default.** It is a stylized low-resolution input stage, not automatic preservation of the scene's source pixels.

| Option | Default | Meaning |
| --- | --- | --- |
| `preset` | `'reference'` | `reference`, `clean`, `soft`, `photoSoft` |
| `inputResolution` | `'auto'` | Positive integer longest edge, or the CSS-size policy below |
| `mode` | `'crt'` | Reconstruction; `'pixelated'` inspects the prepared input; `'original'` bypasses both preparation and CRT |
| [Scalar settings](options.md) | preset values | Direct numeric options/props; `aspect` does not stretch scene geometry |

Auto selects `max(32, ceil((CSSLongestEdge / 384 * 32) / 8) * 8)`, clamped to native input dimensions. CSS size is the renderer's logical size, not DPR-scaled pixels. The other edge is rounded proportionally; the displayed scene rectangle remains unchanged.

### Source pixels

For native-resolution CRT, set `inputResolution` to a positive integer at least as large as the **incoming render buffer's** longest edge. With a full-canvas composer, use its physical drawing-buffer dimensions; account for any custom composer resolution scale. Recompute after resize or DPR changes. There is no `'source'` or `'native'` string option. Even without reduction, a GPU preparation copy isolates source quantization/filtering.

`mode: 'pixelated'` nearest-enlarges that exact prepared texture. `mode: 'original'` uses the full-resolution scene and skips reconstruction, but still follows the adapter's color and opaque-alpha contract. Keep the pass enabled for bypass: disabling a terminal pmndrs pass can leave nothing rendering to screen.

`crt.setOptions(partial)` patches options and returns the pass. Explicit `undefined` clears an override. Changing a preset preserves explicitly set numeric overrides; changing modes preserves settings. Unknown keys, invalid modes and non-positive/non-integer fixed resolutions are rejected.

`inputSize` reports the most recently prepared dimensions, or the original input dimensions in original mode. `stats` includes it plus physical `outputSize`, cumulative `renders`, `drawCalls`, `targetAllocations`, current `targets`, last-frame `preparationPasses`, `floatTargets` (`null` before initialization), and `disposed`. These are diagnostics, not FPS/GPU timing.

## Color, alpha and ownership

The [pipeline](glsl.md) uses real RGBA8 preparation targets, then RGBA16F reconstruction targets if `EXT_color_buffer_float` is available. RGBA8 fallback can clip highlights. Unused preparation levels are released; targets/materials are reused and resized.

Clear/composite the scene against black before CRT. Scene-buffer RGB is treated as already composited; alpha is not multiplied again. Every output mode writes alpha `1`. Transparent pass-through, Display-P3/wide-gamut output, XR stereo/multiview and composer stencil masks are unsupported. The complete composer rectangle is processed, not individual scene objects.

Passes preserve the caller's render target, viewport/scissor, auto-clear and XR enable state. They never dispose the caller's renderer, buffers or input textures. Remove a manually managed pass from its composer and call `dispose()` when finished. Disposal is idempotent; rendering a disposed pass fails. `<CRT>` owns its own disposal.
