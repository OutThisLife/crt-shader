import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
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

async function openExample(t, route) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 740 }, deviceScaleFactor: 1 });
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

async function pixels(page) {
  return page.evaluate(() => {
    const source = window.example.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);
    return { width: canvas.width, height: canvas.height, data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) };
  });
}

for (const route of ['vanilla', 'glsl', 'react', 'three', 'postprocessing', 'r3f']) {
  test(`${route} renders the real package in one WebGL context`, async t => {
    const page = await openExample(t, `/${route}/`);
    const output = await pixels(page);
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
