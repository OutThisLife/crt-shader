# crt-shader

Multi-pass CRT reconstruction for WebGL 2. Original shader implementation and package by Brooklyn ([OutThisLife](https://github.com/OutThisLife)); visual study inspired by Datagubbe's [CRT article](https://datagubbe.se/crt/) and [follow-up](https://datagubbe.se/crt2/).

## Install

```sh
npm install crt-shader
```

[Live examples](https://crt-shader.vercel.app/) · [Source and documentation](https://github.com/OutThisLife/crt-shader)

The package ships ESM and TypeScript declarations. Core/GLSL users need no framework peers. Add peers only for the route you use:

| Route | Exports | Peers |
| --- | --- | --- |
| `crt-shader` | `createRuntime`, `acquireRuntime`, `CRTRenderer`, `prepareInput`, `downsamplePhoto`, `resolveSettings`, `PRESETS` | None |
| `crt-shader/glsl` | `vertex`, `horizontal`, `vertical`, `optics` strings | None |
| `crt-shader/glsl/*.glsl` | Raw shader files | Your bundler's raw-text loader, or copy the files |
| `crt-shader/presets` | `PRESETS` | None |
| `crt-shader/react` | `CRTImage` | `react` |
| `crt-shader/three` | `CRTPass` | `three` |
| `crt-shader/postprocessing` | `CRTPass` | `three`, `postprocessing` |
| `crt-shader/r3f` | `CRT` | `react`, `three`, `postprocessing`, `@react-three/fiber`, `@react-three/postprocessing` |

React browser apps also need their React renderer, normally `react-dom`. Use versions compatible with [package.json](package.json); Fiber 9 requires React 19. Keep one copy of each framework dependency when linking packages.

```jsx
import { CRTImage } from 'crt-shader/react';

<CRTImage src="/artwork.png" alt="Pixel-art landscape" width={480} />
```

`CRTImage` defaults to native pixel input and the `reference` preset. To downsample photos, explicitly set `inputMode="photo"` and a numeric `inputResolution`. Scene adapters instead default to `inputResolution="auto"`, which downsamples. Use a number at least as large as the input buffer's longest edge for native-resolution CRT; `mode="original"` bypasses reconstruction too.

All routes produce opaque output on a black matte. The scene adapters borrow your WebGL renderer and targets; the image runtime owns a separate WebGL context and copies completed frames to 2D canvases. This is a multi-pass GLSL ES 3.00 pipeline, not a single material function. WebGPU, wide-gamut output and transparent pass-through are not supported.

## Guides and examples

- [Core and React image API](https://github.com/OutThisLife/crt-shader/blob/main/docs/images.md)
- [Three, pmndrs and R3F integration](https://github.com/OutThisLife/crt-shader/blob/main/docs/scenes.md)
- [Options](https://github.com/OutThisLife/crt-shader/blob/main/docs/options.md)
- [GLSL imports and pipeline](https://github.com/OutThisLife/crt-shader/blob/main/docs/glsl.md)
- [Agent porting checklist](https://github.com/OutThisLife/crt-shader/blob/main/docs/agents/PORTING.md)
- [Runnable examples](https://github.com/OutThisLife/crt-shader/tree/main/examples)

## License

The project's original code is MIT-licensed; retain the distributed [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) when copying it, including raw GLSL. Datagubbe's articles are inspiration, not upstream shader code. Article text, photographs, game artwork and other third-party assets remain under their own rights; they are not relicensed as MIT. [Credits and provenance](https://github.com/OutThisLife/crt-shader/blob/main/docs/CREDITS.md).
