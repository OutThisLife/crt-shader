# crt-shader

Multi-pass CRT reconstruction for WebGL 2, with image, React, Three.js and pmndrs adapters. Horizontal signal filtering, brightness-dependent scanlines and display optics reconstruct the source pixels. Four frozen presets share the same GLSL ES 3.00 stages.

The output is opaque RGB on a black matte. This is a full-frame pipeline, not a single material shader or a WebGPU effect.

## Install and run

```sh
npm install crt-shader
```

Install only the optional peers needed by your adapter; see [the package README](packages/crt-shader/README.md). Try the [live examples](https://crt-shader.vercel.app/).

To develop locally or build an installable archive:

```sh
pnpm install
pnpm build:glsl
pnpm test
pnpm build
pnpm run pack
# In another application:
npm install /absolute/path/to/crt-shader/artifacts/crt-shader-1.0.0.tgz
```

The filename follows the version in [the package manifest](packages/crt-shader/package.json). `pnpm dev` runs the [examples](examples/). The library ships ES modules and TypeScript declarations; packaging generates raw GLSL and copies the notices and canonical porting guide. Use the pnpm version pinned in [package.json](package.json).

## Choose an entry point

| Import | Use | Guide |
| --- | --- | --- |
| `crt-shader` | Image preparation, runtime, `CRTRenderer`, presets | [Images and core](docs/images.md) |
| `crt-shader/react` | `<CRTImage>` for still images | [React images](docs/images.md#react) |
| `crt-shader/three` | `CRTPass` for Three's native `EffectComposer` | [Scene adapters](docs/scenes.md) |
| `crt-shader/postprocessing` | `CRTPass` for the pmndrs composer | [Scene adapters](docs/scenes.md#pmndrs-postprocessing) |
| `crt-shader/r3f` | `<CRT>` inside `@react-three/postprocessing` | [React Three Fiber](docs/scenes.md#react-three-fiber) |
| `crt-shader/glsl` | Named JavaScript strings: `vertex`, `horizontal`, `vertical`, `optics` | [GLSL and pipeline](docs/glsl.md) |
| `crt-shader/glsl/*.glsl` | Raw shader files for bundlers or copying | [GLSL and pipeline](docs/glsl.md) |
| `crt-shader/presets` | Immutable `PRESETS` | [Options](docs/options.md) |

```jsx
import { CRTImage } from 'crt-shader/react';

<CRTImage src="/artwork.png" alt="Pixel-art landscape" width={480} />
```

Image input defaults to `inputMode="pixel"`, preserving native pixels. Photo downsampling is opt-in. **Scene adapters default to `inputResolution="auto"`, which downsamples the rendered scene.** For CRT at native scene resolution, use a numeric resolution at least as large as the input buffer's longest edge; [Source pixels](docs/scenes.md#input-resolution-and-modes) explains sizing and bypass. There is no `"source"` API value.

## Runnable examples

Run `pnpm dev`, then open the printed local URL with one of these routes. Each uses the public package exports and procedural artwork:

| Route | Entry |
| --- | --- |
| `/vanilla/` | [Core image/canvas](examples/src/vanilla.js); `?input=image` uses a decoded image |
| `/glsl/` | [Raw WebGL 2](examples/src/glsl.js); `?shaders=strings` uses JavaScript shader exports instead of raw files |
| `/react/` | [React images](examples/src/react.js) |
| `/three/` | [Native Three composer](examples/src/three.js) |
| `/postprocessing/` | [pmndrs composer](examples/src/postprocessing.js) |
| `/r3f/` | [React Three Fiber](examples/src/r3f.js) |

## Documentation

- [Image/core API and lifecycle](docs/images.md)
- [Scene integration, color and ownership contracts](docs/scenes.md)
- [Effect options and immutable presets](docs/options.md)
- [Raw GLSL imports, copying and stage contract](docs/glsl.md)
- [Agent porting checklist](docs/agents/PORTING.md)
- [Contribution and release checks](docs/CONTRIBUTING.md)
- [Credits and asset licensing](docs/CREDITS.md)

## Credit and license

Shader implementation and package: **Brooklyn ([OutThisLife](https://github.com/OutThisLife))**. Datagubbe's [The Effect of CRTs on Pixel Art](https://datagubbe.se/crt/) and [follow-up](https://datagubbe.se/crt2/) inspired the visual study; Datagubbe is not credited as the shader author.

This project's original code is MIT-licensed; the distributed [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) define its terms and attribution. Article text, photographs, game sprites and other third-party assets are not relicensed by this project. See [Credits](docs/CREDITS.md) before copying reference material.
