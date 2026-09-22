import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.CRT_TEST_ORIGIN || 'http://127.0.0.1:8766';

async function browserFixture(t) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./react-fixture.js', import.meta.url))],
    absWorkingDir: root, bundle: true, write: false, platform: 'browser', format: 'iife',
    nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  const browser = await chromium.launch({ headless: true, channel: process.env.CRT_TEST_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 3 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  t.after(() => assert.deepEqual(pageErrors, []));
  await page.route(`${origin}/react-fixture.html`, route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><div id="root"></div><script src="/react-fixture.bundle.js"></script>',
  }));
  await page.route(`${origin}/react-fixture.bundle.js`, route => route.fulfill({
    contentType: 'text/javascript', body: result.outputFiles[0].text,
  }));
  await page.goto(`${origin}/react-fixture.html`);
  await page.waitForFunction(() => !!window.fixture);
  return page;
}

test('StrictMode CRT siblings share one context and render independently', async t => {
  const page = await browserFixture(t);
  await page.evaluate(() => fixture.render([
    { key: 'one', source: 'red', width: 138, aspect: 1 },
    { key: 'two', source: 'blue', width: 138, aspect: 1 },
  ]));
  await page.waitForFunction(() => fixture.loads.length === 2, null, { timeout: 10_000 });
  const initial = await page.evaluate(() => ({
    contextCount: fixture.contextCount, one: fixture.snapshot('one'), two: fixture.snapshot('two'),
    errors: fixture.errors, uploads: fixture.uploads.length,
  }));
  assert.equal(initial.contextCount, 1);
  assert.deepEqual(initial.errors, []);
  assert.equal(initial.one.width, 276, 'default DPR is capped at two');
  assert.equal(initial.one.height, 132);
  assert.equal(initial.one.cssWidth, 138);
  assert.equal(initial.one.cssHeight, 66);
  assert.ok(initial.one.pixels.some((value, index) => index % 4 !== 3 && value > 0));
  assert.notDeepEqual(initial.one.pixels, initial.two.pixels);
  await page.evaluate(() => fixture.render([
    { key: 'one', source: 'red', width: 138, aspect: 1, exposure: 0.6 },
    { key: 'two', source: 'blue', width: 138, aspect: 1 },
  ]));
  await page.waitForFunction(() => fixture.loads.length === 3);
  const updated = await page.evaluate(() => ({ one: fixture.snapshot('one'), two: fixture.snapshot('two'), loads: fixture.loads, uploads: fixture.uploads.length }));
  assert.notDeepEqual(updated.one.pixels, initial.one.pixels);
  assert.equal(updated.uploads, initial.uploads, 'effect-only changes reuse prepared input and its GPU upload');
  assert.deepEqual(updated.two.pixels, initial.two.pixels);
  assert.deepEqual(updated.loads.map(load => load.key).sort(), ['one', 'one', 'two']);
  await page.evaluate(() => fixture.render([]));
  await page.waitForFunction(() => fixture.disposedCount === 1);
});

test('photo resolution changes texture pixels without changing original aspect or output resolution', async t => {
  const page = await browserFixture(t);
  await page.evaluate(() => fixture.render([
    { key: 'photo', source: 'red', inputMode: 'photo', inputResolution: 5, width: 138 },
  ]));
  await page.waitForFunction(() => fixture.loads.length === 1);
  const before = await page.evaluate(() => ({ canvas: fixture.snapshot('photo'), upload: fixture.uploads.at(-1) }));
  assert.deepEqual(before.upload, { width: 5, height: 2 });
  assert.equal(before.canvas.cssHeight, 66, 'photo layout ignores historical pixel aspect correction');
  await page.evaluate(() => fixture.render([
    { key: 'photo', source: 'red', inputMode: 'photo', inputResolution: 9, width: 138 },
  ]));
  await page.waitForFunction(() => fixture.loads.length === 2);
  const after = await page.evaluate(() => ({ canvas: fixture.snapshot('photo'), upload: fixture.uploads.at(-1) }));
  assert.deepEqual(after.upload, { width: 9, height: 4 });
  assert.equal(after.canvas.width, before.canvas.width);
  assert.equal(after.canvas.height, before.canvas.height);
  assert.equal(after.canvas.cssHeight, before.canvas.cssHeight);
  assert.notDeepEqual(after.canvas.pixels, before.canvas.pixels);
  await page.evaluate(() => {
    const context = fixture.sources.red.getContext('2d');
    context.fillStyle = '#00ff00'; context.fillRect(0, 0, 23, 11);
    fixture.render([{ key: 'photo', source: 'red', sourceVersion: 'repainted', inputMode: 'photo', inputResolution: 9, width: 138 }]);
  });
  await page.waitForFunction(() => fixture.loads.length === 3);
  const repainted = await page.evaluate(() => fixture.snapshot('photo'));
  assert.notDeepEqual(repainted.pixels, after.canvas.pixels);
});

test('eager remains eager offscreen while lazy waits and cleans up its observer', async t => {
  const page = await browserFixture(t);
  await page.evaluate(() => fixture.render([
    { key: 'eager', source: 'red', width: 138, top: 1600 },
    { key: 'lazy', source: 'blue', width: 138, loading: 'lazy', top: 1600 },
  ]));
  await page.waitForFunction(() => fixture.loads.length > 0);
  assert.deepEqual(await page.evaluate(() => fixture.loads.map(load => load.key)), ['eager']);
  await page.waitForFunction(() => fixture.observerEvents > 0);
  assert.equal(await page.evaluate(() => fixture.activeObservers), 1);
  await page.locator('canvas.lazy').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => fixture.loads.length === 2);
  assert.equal(await page.evaluate(() => fixture.activeObservers), 0);
  await page.evaluate(() => fixture.render([
    { key: 'unseen', source: 'red', width: 138, loading: 'lazy', top: 12000 },
  ]));
  await page.waitForFunction(() => fixture.activeObservers === 1);
  await page.evaluate(() => fixture.render([]));
  assert.equal(await page.evaluate(() => fixture.activeObservers), 0);
  assert.deepEqual(await page.evaluate(() => fixture.loads.map(load => load.key)), ['eager', 'lazy']);
  await page.evaluate(() => {
    window.IntersectionObserver = undefined;
    fixture.render([{ key: 'fallback', source: 'red', width: 138, loading: 'lazy', top: 12000 }]);
  });
  await page.waitForFunction(() => fixture.loads.length === 3);
  assert.equal(await page.evaluate(() => fixture.loads.at(-1).key), 'fallback');
  assert.equal(await page.evaluate(() => fixture.activeObservers), 0);
});

test('a late URL response cannot overwrite a newer source or paint after unmount', async t => {
  const page = await browserFixture(t);
  let slowRoute;
  let markRequested;
  const requested = new Promise(resolve => { markRequested = resolve; });
  await page.route(`${origin}/react-slow.png`, route => { slowRoute = route; markRequested(); });
  const redURL = await page.evaluate(() => fixture.sources.red.toDataURL());
  await page.evaluate(() => fixture.render([{ key: 'race', src: '/react-slow.png', width: 138 }]));
  await requested;
  await page.evaluate(() => fixture.render([{ key: 'race', src: fixture.sources.blue.toDataURL(), width: 138 }]));
  await page.waitForFunction(() => fixture.loads.length === 1);
  const latest = await page.evaluate(() => fixture.snapshot('race'));
  await slowRoute.fulfill({ contentType: 'image/png', body: Buffer.from(redURL.split(',')[1], 'base64') });
  await page.evaluate(() => fixture.settleImage('/react-slow.png'));
  assert.deepEqual(await page.evaluate(() => fixture.snapshot('race')), latest);
  assert.equal(await page.evaluate(() => fixture.loads.length), 1);

  let unmountRoute;
  let markUnmountRequested;
  const unmountRequested = new Promise(resolve => { markUnmountRequested = resolve; });
  await page.route(`${origin}/react-unmounted.png`, route => { unmountRoute = route; markUnmountRequested(); });
  await page.evaluate(() => fixture.render([
    { key: 'race', src: fixture.sources.blue.toDataURL(), width: 138 },
    { key: 'removed', src: '/react-unmounted.png', width: 138 },
  ]));
  await unmountRequested;
  await page.evaluate(() => {
    window.removedCanvas = document.querySelector('canvas.removed');
    fixture.render([{ key: 'race', src: fixture.sources.blue.toDataURL(), width: 138 }]);
  });
  await unmountRoute.fulfill({ contentType: 'image/png', body: Buffer.from(redURL.split(',')[1], 'base64') });
  await page.evaluate(() => fixture.settleImage('/react-unmounted.png'));
  assert.equal(await page.evaluate(() => fixture.loads.length), 1);
  assert.deepEqual(await page.evaluate(() => fixture.errors), []);
  assert.equal(await page.evaluate(() => Array.from(removedCanvas.getContext('2d').getImageData(0, 0, removedCanvas.width, removedCanvas.height).data).some(Boolean)), false);
  await page.evaluate(() => fixture.render([]));
  await page.waitForFunction(() => fixture.disposedCount === 1);
});

test('generic view crops affect framing and geometry with stable scalar dependencies', async t => {
  const page = await browserFixture(t);
  await page.evaluate(() => fixture.render([
    { key: 'crop', source: 'red', width: 120, dpr: 1, aspect: 1, view: { origin: [0, 0], size: [8, 4] } },
  ]));
  await page.waitForFunction(() => fixture.loads.length === 1);
  const before = await page.evaluate(() => fixture.snapshot('crop'));
  assert.equal(before.width, 120);
  assert.equal(before.height, 60);
  assert.equal(before.cssHeight, 60);
  await page.evaluate(() => fixture.render([
    { key: 'crop', source: 'red', width: 120, dpr: 1, aspect: 1, view: { origin: [10, 2], size: [8, 4] } },
  ]));
  await page.waitForFunction(() => fixture.loads.length === 2);
  const after = await page.evaluate(() => fixture.snapshot('crop'));
  assert.notDeepEqual(after.pixels, before.pixels);
  await page.evaluate(async () => {
    fixture.render([{ key: 'crop', source: 'red', width: 120, dpr: 1, aspect: 1, view: { origin: [10, 2], size: [8, 4] } }]);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.equal(await page.evaluate(() => fixture.loads.length), 2);
});

test('a full photo crop keeps original aspect despite rounded input dimensions', async t => {
  const page = await browserFixture(t);
  await page.evaluate(() => fixture.render([{ key: 'photo', source: 'red', inputMode: 'photo', inputResolution: 5, width: 138 }]));
  await page.waitForFunction(() => fixture.loads.length === 1);
  const original = await page.evaluate(() => fixture.snapshot('photo'));
  await page.evaluate(() => fixture.render([{ key: 'photo', source: 'red', inputMode: 'photo', inputResolution: 5, width: 138, view: { origin: [0, 0], size: [5, 2] } }]));
  await page.waitForFunction(() => fixture.loads.length === 2);
  const cropped = await page.evaluate(() => fixture.snapshot('photo'));
  assert.equal(cropped.cssHeight, original.cssHeight, 'a full prepared-texture crop must not stretch the photo');
  assert.deepEqual(cropped, original);
});

test('URL input survives decoded-cache eviction without reprocessing on effect changes', async t => {
  const page = await browserFixture(t);
  await page.evaluate(() => fixture.render([{ key: 'retained', src: fixture.sources.red.toDataURL(), width: 138 }]));
  await page.waitForFunction(() => fixture.loads.length === 1);
  const uploads = await page.evaluate(() => fixture.uploads.length);
  await page.evaluate(() => fixture.settleImage('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="1024"><rect width="100%" height="100%" fill="red"/></svg>')));
  await page.evaluate(() => fixture.render([{ key: 'retained', src: fixture.sources.red.toDataURL(), width: 138, exposure: 0.8 }]));
  await page.waitForFunction(() => fixture.loads.length === 2);
  assert.equal(await page.evaluate(() => fixture.uploads.length), uploads, 'effect changes must keep using the prepared input after LRU eviction');
});

test('image failures reach onError without a success callback', async t => {
  const page = await browserFixture(t);
  await page.route(`${origin}/react-missing.png`, route => route.fulfill({ status: 404, body: 'missing' }));
  await page.evaluate(() => fixture.render([{ key: 'missing', src: '/react-missing.png', width: 138 }]));
  await page.waitForFunction(() => fixture.errors.length === 1);
  assert.equal(await page.evaluate(() => fixture.loads.length), 0);
  assert.ok((await page.evaluate(() => fixture.errors[0].message)).length > 0);
});
