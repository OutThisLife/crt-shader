---
title: "Options and presets"
description: "The four immutable presets and the scalar settings shared by every adapter."
---

`PRESETS` contains `reference` (default), `clean`, `soft` and `photoSoft`. Each settings object and the containing object are frozen. [`presets.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/presets.js) is the source of truth for exact values; do not round or copy them into another defaults table.

```js
import { PRESETS, resolveSettings } from 'crt-shader';

const settings = resolveSettings('reference', { exposure: 1.05 });
// settings is a new complete object; PRESETS.reference is unchanged.
```

The preset changes effect settings only. `photoSoft` does not enable photo preprocessing or choose an input resolution. Reset by removing overrides, not by modifying a preset.

## Scalar settings

All fields in [`CRTSettings`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/index.d.ts) are numeric. Use partial `settings` with the runtime, direct props on `<CRTImage>`/`<CRT>`, or direct options on a `CRTPass`. The synchronous `CRTRenderer` requires a complete settings object, normally returned by `resolveSettings`.

| Setting | Meaning |
| --- | --- |
| `spread` | Horizontal luminance Gaussian width, in source-pixel units |
| `bleed` | Additional horizontal chroma width; this approximates color spread, not composite/NTSC encode/decode |
| `gamma` | Input reconstruction power; also output gamma when `outputGamma` is not positive |
| `beam` | Base vertical beam width, in source-row units |
| `bloom` | Intensity-dependent beam widening; beam energy is normalized |
| `glow` | Neighbor-light diffusion contribution |
| `focus` | Optics sampling offset relative to the source view |
| `mask` | Phosphor modulation strength |
| `exposure` | Light multiplier before color calibration and highlight shoulder |
| `aspect` | Source pixel height/width for React pixel-image layout; ignored for photos and scene geometry |
| `outputGamma` | Output power override; `0` links it to `gamma` |
| `cameraBlur` | Camera-like blur; a positive value replaces the normal focus kernel |
| `blackLevel` | Black lift applied after output transfer |
| `redGain`, `greenGain`, `blueGain` | Per-channel gain before color mixing |
| `maskPitch` | Triad pitch scaled by horizontal source-pixel magnification; `0` selects the legacy three-output-pixel grille |
| `maskPhase` | RGB stripe phase |
| `slot`, `slotPhase` | Gap modulation strength and phase in the non-legacy mask |
| `maskSlant` | Mask tilt across the output |
| `beamTilt` | Scanline tilt across the output |
| `maskWarp` | Quadratic mask phase warp |
| `rg`, `rb` | Green and blue contributions to red |
| `gr`, `gb` | Red and blue contributions to green |
| `br`, `bg` | Red and green contributions to blue |

`resolveSettings` rejects unknown keys and non-finite values, but does not clamp artistic ranges. `undefined` overrides are ignored. The ranges in `controlGroups` in `presets.js` are UI guidance, not validation or safe bounds for every combination. Keep Gaussian widths positive and avoid singular mask/beam parameters when experimenting.

For images, [`inputMode`, `inputResolution`, geometry and caching](/images) are separate from the effect. For scenes, [`inputResolution`, `mode` and pass updates](/scenes#input-resolution-and-modes) are separate too. None of those options belongs inside a runtime `settings` object.

`crt-shader/presets` documents/types `PRESETS`. The source also contains legacy UI/registration data; the photographic registration is not a portable crop preset or a supported renderer option. Use an explicit image `view` crop instead.
