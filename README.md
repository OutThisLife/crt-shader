# crt-shader

Multi-pass CRT rendering for WebGL 2, with image, React, Three.js and pmndrs adapters. The pipeline applies signal filtering, brightness-dependent scanlines and display optics.

[Documentation](https://crt-shader.vercel.app/) · [Gallery](https://crt-shader.vercel.app/examples/gallery/) · [npm](https://www.npmjs.com/package/crt-shader)

## Install

```sh
pnpm add crt-shader
```

The package ships ES modules and TypeScript declarations. [Get started](https://crt-shader.vercel.app/) has working examples and the dependencies for each adapter.

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

## Integrations

| Import | Use | Guide |
| --- | --- | --- |
| `crt-shader` | Image preparation, runtime, `CRTRenderer`, presets | [Vanilla JavaScript](https://crt-shader.vercel.app/guides/vanilla/) |
| `crt-shader/react` | `<CRTImage>` for still images | [React](https://crt-shader.vercel.app/guides/react/) |
| `crt-shader/three` | `CRTPass` for Three's native `EffectComposer` | [Three.js](https://crt-shader.vercel.app/guides/three/) |
| `crt-shader/postprocessing` | `CRTPass` for the pmndrs composer | [pmndrs](https://crt-shader.vercel.app/guides/postprocessing/) |
| `crt-shader/r3f` | `<CRT>` inside `@react-three/postprocessing` | [React Three Fiber](https://crt-shader.vercel.app/guides/r3f/) |
| `crt-shader/presets` | Immutable `PRESETS` | [Options](https://crt-shader.vercel.app/options/) |

Images preserve native pixels by default; photo downsampling is opt-in. Scene adapters default to `inputResolution="auto"`, which downsamples the rendered scene. For native-resolution CRT, set a numeric resolution at least as large as the input buffer's longest edge. See [scene input sizing](https://crt-shader.vercel.app/scenes/#input-resolution-and-modes).

The effect processes full frames with opaque RGB output on a black matte.

For custom integrations, see the [GLSL reference](docs/glsl.md) and [porting guide](https://crt-shader.vercel.app/agents/PORTING/).

## Development

Use the pnpm version pinned in [package.json](package.json).

```sh
pnpm install
pnpm docs:dev
```

The docs run at `http://127.0.0.1:3000/`. Use `pnpm dev` for the standalone [examples](examples/). Build, package and release commands are in [Contributing](https://crt-shader.vercel.app/CONTRIBUTING/).

## Credit and license

Code by Brooklyn ([OutThisLife](https://github.com/OutThisLife)), with visual inspiration from Datagubbe's [CRT article](https://datagubbe.se/crt/) and [follow-up](https://datagubbe.se/crt2/).

Original code is MIT-licensed; retain [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) when copying or porting it. Third-party images and articles have separate rights. See [Credits](https://crt-shader.vercel.app/CREDITS/).
