---
title: "GLSL and porting"
description: "GLSL imports, render targets, uniforms and color handling for a custom host."
---

The GLSL ES 3.00 source requires WebGL 2 and separate horizontal, vertical and optics passes. Use the [porting checklist](/agents/PORTING) when implementing another host.

## Import or copy

Without a raw-file loader:

```js
import { vertex, horizontal, vertical, optics } from 'crt-shader/glsl';
import { PRESETS } from 'crt-shader/presets';
```

With Vite's raw-text loader:

```js
import vertex from 'crt-shader/glsl/vertex.glsl?raw';
import horizontal from 'crt-shader/glsl/horizontal.glsl?raw';
import vertical from 'crt-shader/glsl/vertical.glsl?raw';
import optics from 'crt-shader/glsl/optics.glsl?raw';
```

`?raw` requires a bundler text loader. Alternatively, copy `vertex.glsl`, `horizontal.glsl`, `vertical.glsl` and `optics.glsl` from the package's `glsl/` directory. Include `LICENSE` and `NOTICE.md`, identify changes and retain Brooklyn (OutThisLife)'s implementation credit. Datagubbe's articles provided visual inspiration; [asset rights are separate](/CREDITS).

`pnpm build:glsl` generates the [raw files](https://github.com/OutThisLife/crt-shader/tree/main/packages/crt-shader/glsl/) from [`shaders.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/shaders.js) using [`scripts/export-glsl.mjs`](https://github.com/OutThisLife/crt-shader/blob/main/scripts/export-glsl.mjs). Do not hand-edit generated files. Preset values are in [`presets.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/presets.js); a runnable host is in [`examples/src/glsl.js`](https://github.com/OutThisLife/crt-shader/blob/main/examples/src/glsl.js).

## Stage contract

Use prepared-source dimensions `Sw × Sh` and physical output dimensions `W × H`. `viewOrigin`/`viewSize` use top-left prepared-source coordinates; `[0, 0]` / `[Sw, Sh]` selects the whole image. Retain the full source texture for neighboring samples.

| Stage | Input | Destination | Sampling of this stage's input |
| --- | --- | --- | --- |
| Preparation | Display-encoded, black-composited RGB | Source-resolution or reduced RGBA8 texture | Native image upload or progressive reduction |
| Horizontal | Prepared source | `W × Sh` reconstruction target | Nearest |
| Vertical | Horizontal result | `W × H` reconstruction target | Nearest |
| Optics | Vertical result | `W × H` screen/output | Linear |

Use non-mipmapped `CLAMP_TO_EDGE` textures. Shaders return black outside the normalized source domain. Allocate reconstruction targets as RGBA16F/HALF_FLOAT with `EXT_color_buffer_float`, or RGBA8/UNSIGNED_BYTE otherwise. The fallback can clip highlights. Check framebuffer completeness.

For each reconstruction stage:

- Keep `sourceSize` at prepared-input `[Sw, Sh]`, regardless of intermediate texture dimensions.
- Keep `outputSize` at physical `[W, H]`, and `viewOrigin`/`viewSize` at the prepared-source crop.
- Bind `tex` to the stage input, set `bypass` to `0` and supply every scalar from resolved settings. `aspect` controls host layout only; unused uniform locations may be `null`.
- Disable blending and depth tests/writes. Each stage emits opaque alpha. Preserve stage order and kernels; disable implicit engine color conversion.

The vertex shader takes two-component clip-space `a_position` and derives `uv`. Existing hosts draw a full-screen rectangle with six vertices/two triangles. In Three, use `RawShaderMaterial` with `GLSL3`, strip the source's leading `#version 300 es` because Three adds it, and set a geometry draw range. Engines that expect `position` may otherwise submit no vertices.

## Orientation and color

[`renderer.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/renderer.js) uploads DOM images with `UNPACK_FLIP_Y_WEBGL = true`, then restores it. GPU render-target textures already have the expected orientation. The vertical shader applies its own coordinate flips; check orientation with an asymmetric test image.

The shaders consume display-encoded RGB and apply reconstruction `gamma`, color calibration, highlight shoulder and output power. Composite images and scenes on black before CRT. Scene alpha is ignored because RGB is already composited. Output is opaque and is not scene-referred HDR.

For native Three, put `OutputPass` before CRT and do not encode afterward. For pmndrs, supply tone-mapped linear RGB, encode before averaging in the first preparation stage, and decode offscreen output to linear for one final screen encode. See [`three-pipeline.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/three-pipeline.js) and [scene integration](/scenes) for buffer order and color handling.

The host must provide input reduction, resource management and scene color wrappers. WebGPU/WGSL, Unity/HLSL and Godot implementations are not included.
