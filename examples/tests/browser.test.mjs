import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { before, after, test } from 'node:test';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://crt-examples.test';
const consumer = process.env.CRT_TEST_PACKAGE_ROOT;
const packageRequire = consumer ? createRequire(join(consumer, 'package.json')) : require;
let browser, files, html;

before(async () => {
  // Bundle in memory and intercept requests; never start a server or build the library.
  const result = await build({
    absWorkingDir: root, entryPoints: ['src/main.js'], bundle: true,
    write: false, outdir: 'test-bundle', platform: 'browser', format: 'esm',
    define: { 'process.env.NODE_ENV': '"development"' },
    nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
    plugins: [{ name: 'raw-glsl', setup(build) {
      // Resolve through the installed package's export maps, not path aliases.
      build.onResolve({ filter: /^(crt-shader|react|react-dom|three|postprocessing|@react-three\/fiber|@react-three\/postprocessing)(\/|$)/ }, args => {
        if (!consumer || args.pluginData?.installed || args.path.endsWith('?raw')) return;
        return build.resolve(args.path, { resolveDir: consumer, kind: args.kind, pluginData: { installed: true } });
      });
      build.onResolve({ filter: /\.glsl\?raw$/ }, args => ({
        path: packageRequire.resolve(args.path.replace(/\?raw$/, '')), namespace: 'raw-glsl',
      }));
      build.onLoad({ filter: /.*/, namespace: 'raw-glsl' }, async args => ({
        contents: await readFile(args.path, 'utf8'), loader: 'text',
      }));
    } }],
  });
  files = new Map(result.outputFiles.map(file => [file.path.split('/').at(-1), file.text]));
  html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
    .replace('/src/main.js', '/main.js')
    .replace('</head>', '<link rel="stylesheet" href="/main.css"></head>');
  browser = await chromium.launch({ headless: true, channel: process.env.CRT_TEST_BROWSER_CHANNEL || 'chrome' });
});
after(async () => { await browser?.close(); });

async function openExample(t, route, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 740 }, deviceScaleFactor: 1, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  t.after(() => assert.deepEqual(errors, [], 'no page or console errors'));
  await page.addInitScript(() => {
    window.webglCanvases = new Set();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const result = original.call(this, type, ...args);
      if (result && /^webgl/.test(type)) window.webglCanvases.add(this);
      return result;
    };
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    assert.equal(url.origin, origin, 'examples need no external images or network');
    const file = files.get(url.pathname.slice(1));
    if (file !== undefined) return request.fulfill({ body: file, contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
    return request.fulfill({ body: html, contentType: 'text/html' });
  });
  await page.goto(`${origin}${route}`);
  await page.waitForFunction(() => window.example?.ready === true, null, { timeout: 15_000 });
  return page;
}

async function pixels(page, displayedCopy = false) {
  return page.evaluate(displayedCopy => {
    const { canvas: source } = window.example;
    // Core/React copy their owned GPU canvas to a visible 2D canvas. Inspect
    // that real GPU buffer too, rather than substituting a screenshot read.
    const gpuCanvas = [...webglCanvases][0];
    const gl = !displayedCopy && gpuCanvas.getContext('webgl2');
    if (gpuCanvas.width !== source.width || gpuCanvas.height !== source.height) throw new Error('GPU/display copy dimensions differ');
    if (gl) {
      // A terminal pmndrs pass restores its caller's offscreen binding. Read
      // the actual screen framebuffer, not that half-float target as bytes.
      const previous = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const data = new Uint8Array(source.width * source.height * 4);
      gl.readPixels(0, 0, source.width, source.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.bindFramebuffer(gl.FRAMEBUFFER, previous);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Framebuffer read failed');
      const topDown = new Uint8Array(data.length), stride = source.width * 4;
      for (let y = 0; y < source.height; y++) topDown.set(data.subarray(y * stride, (y + 1) * stride), (source.height - y - 1) * stride);
      return { width: source.width, height: source.height, data: Array.from(topDown) };
    }
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);
    return { width: canvas.width, height: canvas.height, data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) };
  }, displayedCopy);
}

const routes = ['vanilla', 'glsl', 'react', 'three', 'postprocessing', 'r3f'];

async function dimensions(page) {
  return page.evaluate(() => {
    const { canvas, renderer, crt } = window.example;
    const source = document.querySelector('#source canvas');
    const gl = [...webglCanvases][0].getContext('webgl2');
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    const uniform = name => Array.from(gl.getUniform(program, gl.getUniformLocation(program, name)));
    const rect = element => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    };
    return {
      output: { width: canvas.width, height: canvas.height },
      source: { width: source.width, height: source.height },
      displayed: rect(canvas), sourceDisplayed: rect(source),
      dpr: renderer?.getPixelRatio() ?? gl.canvas.width / canvas.parentElement.offsetWidth,
      prepared: crt?.inputSize ?? null,
      stages: crt?.stats.outputSize ?? null,
      gpuSource: uniform('sourceSize'), gpuOutput: uniform('outputSize'),
      viewOrigin: uniform('viewOrigin'), viewSize: uniform('viewSize'),
    };
  });
}

for (const deviceScaleFactor of [1, 2]) {
  test(`adapter dimensions stay matched across layout and device DPR ${deviceScaleFactor}`, async t => {
    const pages = [];
    for (const route of routes) pages.push(await openExample(t, `/${route}/`, { deviceScaleFactor }));
    const initialFrames = await Promise.all(pages.map(page => pixels(page)));
    for (const viewport of [{ width: 1000, height: 740 }, { width: 360, height: 740 }, { width: 1280, height: 800 }]) {
      const measured = [];
      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        await page.setViewportSize(viewport);
        // Wait through ResizeObserver + Fiber's measured-size update.
        await page.waitForTimeout(250);
        measured.push({ route: routes[index], ...await dimensions(page) });
        assert.deepEqual(await pixels(page), initialFrames[index], 'layout resize must not change the frozen framebuffer');
        if (process.env.CRT_EXAMPLE_SCREENSHOTS) {
          await mkdir(process.env.CRT_EXAMPLE_SCREENSHOTS, { recursive: true });
          await page.screenshot({ path: `${process.env.CRT_EXAMPLE_SCREENSHOTS}/dimensions-${routes[index]}-${viewport.width}-dpr${deviceScaleFactor}.png`, fullPage: true });
        }
      }
      t.diagnostic(JSON.stringify({ viewport, deviceScaleFactor, measured }));
      if (process.env.CRT_EXAMPLE_SCREENSHOTS) {
        await writeFile(`${process.env.CRT_EXAMPLE_SCREENSHOTS}/dimensions-${viewport.width}-dpr${deviceScaleFactor}.json`, JSON.stringify({ viewport, deviceScaleFactor, measured }, null, 2));
      }
      assert.deepEqual(measured.map(item => item.output), measured.map(() => measured[0].output), 'all six drawing buffers match');
      for (const actual of measured) {
        assert.deepEqual(actual.output, measured[0].output, `${actual.route}: same drawing buffer`);
        assert.deepEqual(actual.source, measured[0].source, `${actual.route}: same native source`);
        assert.deepEqual(actual.displayed, measured[0].displayed, `${actual.route}: same displayed size`);
        assert.deepEqual(actual.displayed, actual.sourceDisplayed, `${actual.route}: original/output framing`);
        assert.equal(actual.dpr, 1, 'example output is independent of monitor DPR');
        assert.deepEqual(actual.gpuSource, [actual.source.width, actual.source.height], 'actual GLSL source dimensions');
        assert.deepEqual(actual.gpuOutput, [actual.output.width, actual.output.height], 'actual GLSL output dimensions');
        assert.deepEqual(actual.viewOrigin, [0, 0], 'whole-source origin');
        assert.deepEqual(actual.viewSize, actual.gpuSource, 'whole-source framing');
        if (actual.prepared) assert.deepEqual(actual.prepared, actual.source, 'CRT consumes the same native source resolution');
        if (actual.stages) assert.deepEqual(actual.stages, actual.output, 'CRT output matches the drawing buffer');
        assert.ok(actual.displayed.width <= actual.output.width, 'never stretch the fixed reconstruction above its output resolution');
      }
    }
  });
}

test('embed mode removes site chrome without changing the rendered example', async t => {
  for (const route of routes) {
    const normal = await openExample(t, `/${route}/`);
    const expected = await pixels(normal);
    await normal.close();
    const page = await openExample(t, `/${route}/?embed`);
    assert.deepEqual(await pixels(page), expected, 'embedding changes only surrounding chrome');
    assert.equal(await page.locator('header').isVisible(), false, 'managed docs own navigation and preset selection');
    assert.equal(await page.locator('#title').isVisible(), false);
    assert.equal(await page.locator('#description').isVisible(), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgba(0, 0, 0, 0)');
    const actual = await dimensions(page);
    assert.deepEqual(actual.displayed, actual.sourceDisplayed);
    if (process.env.CRT_EXAMPLE_SCREENSHOTS) {
      await mkdir(process.env.CRT_EXAMPLE_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.CRT_EXAMPLE_SCREENSHOTS}/embed-${route}.png`, omitBackground: true, fullPage: true });
    }
    await page.close();
  }
});

for (const route of routes) {
  test(`${route} renders the real package in one WebGL context`, async t => {
    const page = await openExample(t, `/${route}/`);
    const output = await pixels(page);
    assert.deepEqual(await pixels(page, true), output, 'visible canvas matches real GPU framebuffer');
    assert.ok(output.width > 0 && output.height > 0);
    const rgb = output.data.filter((_, index) => index % 4 !== 3);
    assert.ok(rgb.filter(value => value > 24).length > rgb.length / 20, 'nonblank output');
    assert.ok(new Set(rgb).size > 32, 'reconstruction produces tonal detail');
    assert.equal(await page.evaluate(() => webglCanvases.size), 1, 'no adapter-owned second context');
    assert.ok(await page.locator('canvas').count() >= 2, 'source pattern and output are visible');
    if (process.env.CRT_EXAMPLE_SCREENSHOTS) {
      await mkdir(process.env.CRT_EXAMPLE_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.CRT_EXAMPLE_SCREENSHOTS}/${route}.png`, fullPage: true });
    }
    await page.evaluate(() => window.example.dispose());
  });
}

function pixelError(actual, expected) {
  assert.equal(actual.width, expected.width, 'framebuffer width');
  assert.equal(actual.height, expected.height, 'framebuffer height');
  let max = 0, sum = 0, changed = 0;
  for (let i = 0; i < actual.data.length; i++) {
    const error = Math.abs(actual.data[i] - expected.data[i]);
    max = Math.max(max, error); sum += error; changed += error !== 0;
  }
  return { max, mean: sum / actual.data.length, changed };
}

test('scene cameras preserve the complete source artwork and colors', async t => {
  for (const route of ['three', 'postprocessing', 'r3f']) {
    const page = await openExample(t, `/${route}/`);
    const expected = await page.evaluate(() => {
      const { renderer, scene, camera, canvas } = window.example;
      const target = renderer.getRenderTarget(), autoClear = renderer.autoClear;
      renderer.setRenderTarget(null);
      renderer.autoClear = true;
      renderer.render(scene, camera);
      renderer.setRenderTarget(target);
      renderer.autoClear = autoClear;
      const reference = document.createElement('canvas');
      reference.width = canvas.width; reference.height = canvas.height;
      const context = reference.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(document.querySelector('#source canvas'), 0, 0, reference.width, reference.height);
      return { width: reference.width, height: reference.height, data: Array.from(context.getImageData(0, 0, reference.width, reference.height).data) };
    });
    const error = pixelError(await pixels(page), expected);
    t.diagnostic(JSON.stringify({ route, unprocessedSceneVsArtwork: error }));
    assert.ok(error.max <= 1, 'full-frame nearest source, allowing one byte of sRGB round-trip precision');
  }
});

async function preparedPixels(page) {
  return page.evaluate(() => {
    const { renderer, crt } = window.example;
    const pipeline = crt.pipeline;
    const target = pipeline.targets.get(`prepare-${crt.stats.preparationPasses - 1}`);
    const data = new Uint8Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, data);
    const topDown = new Uint8Array(data.length), stride = target.width * 4;
    for (let y = 0; y < target.height; y++) topDown.set(data.subarray(y * stride, (y + 1) * stride), (target.height - y - 1) * stride);
    return { width: target.width, height: target.height, data: Array.from(topDown) };
  });
}

for (const preset of ['reference', 'clean', 'soft', 'photoSoft']) {
  test(`scene framebuffer parity at matched input/output (${preset})`, async t => {
    const pages = [];
    for (const route of ['three', 'postprocessing', 'r3f']) {
      pages.push(await openExample(t, `/${route}/?preset=${preset}`));
    }
    const frames = await Promise.all(pages.map(page => pixels(page)));
    const inputs = await Promise.all(pages.map(preparedPixels));
    const core = await openExample(t, `/vanilla/?preset=${preset}`);
    const originalCore = await pixels(core);
    // Isolate the CRT itself from scene preparation. The scene adapters reduce
    // a rasterized 384×288 scene to 64×48 via multiple RGBA8 targets; that is not
    // byte-identical to uploading the original 64×48 artwork directly.
    await core.evaluate(async input => {
      const source = document.createElement('canvas');
      source.width = input.width; source.height = input.height;
      source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(input.data), input.width, input.height), 0, 0);
      const { runtime, canvas, preset } = window.example;
      await runtime.render({ source, output: canvas, preset, width: canvas.width, height: canvas.height, sourceVersion: 0 });
    }, inputs[0]);
    const sameInputCore = await pixels(core);
    const source = await pages[0].evaluate(() => {
      const canvas = document.querySelector('#source canvas');
      return { width: canvas.width, height: canvas.height, data: Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data) };
    });
    const error = {
      preset,
      browser: browser.version(),
      gpu: await pages[0].evaluate(() => {
        const gl = window.example.renderer.getContext();
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      }),
      source: { width: inputs[0].width, height: inputs[0].height },
      output: { width: frames[0].width, height: frames[0].height },
      nativePmndrs: pixelError(frames[0], frames[1]),
      nativeR3f: pixelError(frames[0], frames[2]),
      pmndrsR3f: pixelError(frames[1], frames[2]),
      inputNativePmndrs: pixelError(inputs[0], inputs[1]),
      inputPmndrsR3f: pixelError(inputs[1], inputs[2]),
      nativeInputOriginal: pixelError(inputs[0], source),
      nativeOriginalCore: pixelError(frames[0], originalCore),
      nativeSameInputCore: pixelError(frames[0], sameInputCore),
    };
    t.diagnostic(JSON.stringify(error));
    if (process.env.CRT_EXAMPLE_SCREENSHOTS) {
      await mkdir(process.env.CRT_EXAMPLE_SCREENSHOTS, { recursive: true });
      await writeFile(`${process.env.CRT_EXAMPLE_SCREENSHOTS}/parity-${preset}.json`, JSON.stringify(error, null, 2));
      for (const [index, route] of ['three', 'postprocessing', 'r3f'].entries()) {
        await pages[index].locator('#output canvas').screenshot({ path: `${process.env.CRT_EXAMPLE_SCREENSHOTS}/parity-${preset}-${route}.png` });
      }
    }
    for (const frame of frames) assert.ok(frame.data.some((value, i) => i % 4 !== 3 && value > 128), 'nonblank GPU output');
    assert.equal(error.pmndrsR3f.max, 0, 'same pmndrs pipeline, exact framebuffer parity');
    assert.equal(error.inputPmndrsR3f.max, 0, 'same actual source texture');
    assert.ok(error.nativeSameInputCore.max <= 1, 'same prepared input through core vs Three CRT, with one-byte intermediate precision tolerance');
    assert.ok(error.inputNativePmndrs.max <= 1, 'native encode vs pmndrs linear half-float intermediates');
    assert.ok(error.nativePmndrs.max <= 2, 'bounded intermediate color-transfer precision, not a visual scale difference');
    assert.ok(error.nativeR3f.max <= 2);
  });
}

for (const preset of ['reference', 'clean', 'soft', 'photoSoft']) {
  test(`raw GLSL files and JS strings match core pixels (${preset})`, async t => {
    const core = await openExample(t, `/vanilla/?preset=${preset}`);
    const expected = await pixels(core);
    for (const shaders of ['files', 'strings']) {
      const raw = await openExample(t, `/glsl/?preset=${preset}&shaders=${shaders}`);
      assert.deepEqual(await pixels(raw), expected, `exact ${shaders}/core framebuffer parity`);
      await raw.close();
    }
  });
}

test('decoded image and React CRTImage match the canvas core path', async t => {
  const core = await openExample(t, '/vanilla/');
  const expected = await pixels(core);
  for (const route of ['/vanilla/?input=image', '/react/']) {
    const page = await openExample(t, route);
    assert.deepEqual(await pixels(page), expected, `${route} shares source and frozen settings`);
  }
});
