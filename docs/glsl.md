# GLSL imports and pipeline

The portable source is GLSL ES 3.00 for WebGL 2: one vertex shader and three ordered fragment stages. It is not a single `ShaderMaterial` fragment function. The [agent porting checklist](agents/PORTING.md) covers implementation and verification in another host.

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

`?raw` is a bundler feature, not a Node or browser-native import syntax. Other bundlers need their own text loader. Alternatively copy `vertex.glsl`, `horizontal.glsl`, `vertical.glsl` and `optics.glsl` from the installed package's `glsl/` directory. Include the package's `LICENSE` and `NOTICE.md`, identify your changes, and retain Brooklyn (OutThisLife)'s implementation credit. Datagubbe's articles are visual inspiration, not shader source/authorship; [asset rights are separate](CREDITS.md).

[`shaders.js`](../packages/crt-shader/shaders.js) is canonical and frozen. `pnpm build:glsl` generates the [raw files](../packages/crt-shader/glsl/) through [`scripts/export-glsl.mjs`](../scripts/export-glsl.mjs). Never hand-edit generated output. Preset values come from [`presets.js`](../packages/crt-shader/presets.js); copy the applicable notices with a port. See [`examples/src/glsl.js`](../examples/src/glsl.js) for a runnable raw-GLSL host instead of a second implementation in this document.

## Stage contract

Let the prepared source be `Sw × Sh`, the output framebuffer be `W × H`, and the image view be `viewOrigin`/`viewSize`. A whole-image view is `[0, 0]` / `[Sw, Sh]`. Views use top-left prepared-source coordinates and retain the full source texture for neighboring samples.

| Stage | Input | Destination | Sampling of this stage's input |
| --- | --- | --- | --- |
| Preparation | Display-encoded, black-composited RGB | Real source-resolution or reduced RGBA8 texture | Native image upload or progressive reduction |
| Horizontal | Prepared source | `W × Sh` reconstruction target | Nearest |
| Vertical | Horizontal result | `W × H` reconstruction target | Nearest |
| Optics | Vertical result | `W × H` screen/output | Linear |

Use non-mipmapped `CLAMP_TO_EDGE` textures. The shaders additionally return black for samples outside the normalized source domain. Allocate the two reconstruction targets as RGBA16F/HALF_FLOAT when `EXT_color_buffer_float` permits rendering to them; otherwise use RGBA8/UNSIGNED_BYTE and disclose the possible highlight clipping. Check framebuffer completeness.

For all three frozen stages:

- `sourceSize` remains the **prepared input** `[Sw, Sh]`, even when the current sampled texture has a different width. Do not replace it with each intermediate target's dimensions.
- `outputSize` remains final physical `[W, H]`; `viewOrigin` and `viewSize` remain the prepared-source crop. Output/source dimensions, not CSS dimensions, drive the shader.
- Bind `tex` to the current stage input, set `bypass` to `0`, and supply every scalar from a complete resolved preset. `aspect` is a host layout value, not a shader uniform; unused uniform locations may be `null`.
- Disable blending and depth tests/writes. Each stage emits opaque alpha. Do not merge stages, change kernels or insert implicit engine color conversion.

The vertex shader expects two-component clip-space `a_position`, derives `uv` from it, and draws a full-screen rectangle. The existing hosts use six vertices/two triangles. In Three, use `RawShaderMaterial` with `GLSL3`, strip only the leading `#version 300 es` because Three adds it, and set an explicit geometry draw range for the custom attribute. A generic engine may otherwise expect an attribute named `position` and submit no vertices.

## Orientation and color

[`renderer.js`](../packages/crt-shader/renderer.js) uploads DOM images with `UNPACK_FLIP_Y_WEBGL = true`, then restores it. GPU render-target textures already follow the adapter's expected orientation. The frozen vertical shader contains its own coordinate flips. Match these conventions with an asymmetric test image rather than adding speculative UV flips.

The shaders consume display-encoded RGB, apply their own reconstruction `gamma`, color calibration, highlight shoulder and output power. This is not a general linear-light HDR effect. Image preprocessing composites on black. Scene input RGB must already be composited on black; its alpha is ignored rather than multiplied again. Output is always opaque.

For native Three, put `OutputPass` before CRT and do not encode afterward. For pmndrs, feed tone-mapped linear RGB, encode **before** averaging in the first preparation stage, and decode offscreen CRT output back to linear for one final screen encode. The exact wrappers are in [`three-pipeline.js`](../packages/crt-shader/three-pipeline.js); follow [scene integration](scenes.md) rather than adapting the buffer order or color flags by guesswork.

The raw shaders do not include input reduction, resource management or scene color wrappers. A port must provide those explicitly. No WebGPU/WGSL, Unity/HLSL or Godot implementation is shipped or implied by these GLSL exports.
