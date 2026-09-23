---
title: "Options and presets"
description: "Presets and numeric effect settings for every adapter."
---

`PRESETS` contains `reference` (default), `clean`, `soft` and `photoSoft`. The object and its settings are immutable. See [`presets.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/presets.js) for values.

```js
import { PRESETS, resolveSettings } from 'crt-shader';

const settings = resolveSettings('reference', { exposure: 1.05 });
// settings is a new complete object; PRESETS.reference is unchanged.
```

A preset changes effect settings only; `photoSoft` does not enable photo preparation or choose a resolution. Remove overrides to restore preset values.

## Scalar settings

All [`CRTSettings`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/index.d.ts) fields are numeric. Pass partial `settings` to the runtime, direct props to `<CRTImage>`/`<CRT>`, or direct options to `CRTPass`. Synchronous `CRTRenderer` calls require complete settings; use `resolveSettings` to create them.

| Setting | Meaning |
| --- | --- |
| `spread` | Horizontal luminance Gaussian width, in source-pixel units |
| `bleed` | Additional horizontal chroma width; approximates color spread without composite/NTSC encoding |
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

`resolveSettings` rejects unknown keys and non-finite values, ignores `undefined` overrides and leaves numeric ranges unclamped. The `controlGroups` ranges in `presets.js` guide UI controls; they do not validate settings or guarantee valid combinations. Keep Gaussian widths positive and avoid singular mask/beam parameters.

Keep [image preparation, geometry and caching options](/images) and [scene resolution, modes and updates](/scenes#input-resolution-and-modes) outside the runtime `settings` object.

`PRESETS` is the documented, typed export of `crt-shader/presets`. Legacy UI/registration data in the module is not a supported renderer option. Use image `view` for cropping.
