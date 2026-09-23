# crt-shader

Multi-pass CRT rendering for WebGL 2, with React, Three.js and pmndrs adapters.

[Documentation](https://crt-shader.vercel.app/) · [Gallery](https://crt-shader.vercel.app/examples/gallery/) · [Source](https://github.com/OutThisLife/crt-shader)

## Install

```sh
pnpm add crt-shader
```

The package ships ES modules and TypeScript declarations. The core renderer needs no framework dependencies.

Paste this into a browser module, such as `src/main.js` in a Vite app. It draws its own source image.

```js
import { createRuntime, prepareInput } from 'crt-shader';

const source = document.createElement('canvas');
source.width = 64;
source.height = 48;
const context = source.getContext('2d');
context.fillStyle = '#fff';
context.font = 'bold 24px monospace';
context.fillText('CRT', 4, 32);

const output = document.body.appendChild(document.createElement('canvas'));
output.setAttribute('aria-label', 'CRT text');
output.style.maxWidth = '100%';
const runtime = createRuntime();
try {
  await runtime.render({
    source: prepareInput(source), output,
    width: 512, height: 384, preset: 'reference',
  });
} finally {
  runtime.dispose();
}
```

## Frameworks

Install the peers for your adapter:

| Route | Exports | Peers |
| --- | --- | --- |
| `crt-shader` | `createRuntime`, `acquireRuntime`, `CRTRenderer`, `prepareInput`, `downsamplePhoto`, `resolveSettings`, `PRESETS` | None |
| `crt-shader/presets` | `PRESETS` | None |
| `crt-shader/react` | `CRTImage` | `react` |
| `crt-shader/three` | `CRTPass` | `three` |
| `crt-shader/postprocessing` | `CRTPass` | `three`, `postprocessing` |
| `crt-shader/r3f` | `CRT` | `react`, `three`, `postprocessing`, `@react-three/fiber`, `@react-three/postprocessing` |

React browser apps also need a renderer such as `react-dom`. Use versions compatible with [package.json](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/package.json); Fiber 9 requires React 19. Keep one copy of each peer dependency when linking packages.

## Rendering behavior

`CRTImage` defaults to native pixel input and the `reference` preset. Set `inputMode="photo"` to downsample photos; `inputResolution` sets the longest edge and defaults to `96`.

Scene adapters default to `inputResolution="auto"`, which downsamples. For native-resolution CRT, use a number at least as large as the input buffer's longest edge. `mode="original"` bypasses reconstruction and downsampling.

Output is opaque RGB on a black matte. Scene adapters borrow your WebGL renderer and targets; the image runtime owns a separate WebGL context and copies frames to 2D canvases. The pipeline requires WebGL 2. Wide-gamut output and transparent pass-through are unsupported.

## Guides and examples

- [Core and React image API](https://crt-shader.vercel.app/images/)
- [Three.js, pmndrs and R3F integration](https://crt-shader.vercel.app/scenes/)
- [Options and presets](https://crt-shader.vercel.app/options/)
- [Working examples for every integration](https://crt-shader.vercel.app/)

For custom integrations, [GLSL exports](https://github.com/OutThisLife/crt-shader/blob/main/docs/glsl.md) and the [porting guide](https://crt-shader.vercel.app/agents/PORTING/) describe the stage contract.

## License

Code by Brooklyn ([OutThisLife](https://github.com/OutThisLife)), with visual inspiration from Datagubbe's [CRT article](https://datagubbe.se/crt/) and [follow-up](https://datagubbe.se/crt2/).

Original code is MIT-licensed; retain the distributed [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) when copying or porting it, including raw GLSL. Third-party images and articles have separate rights. See [Credits](https://crt-shader.vercel.app/CREDITS/).
