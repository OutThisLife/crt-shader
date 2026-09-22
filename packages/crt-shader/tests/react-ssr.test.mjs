import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const root = fileURLToPath(new URL('../', import.meta.url));

test('React entry imports and renders accessible canvas markup without browser globals', async () => {
  assert.equal(typeof document, 'undefined');
  assert.equal(typeof window, 'undefined');
  const result = await build({
    stdin: {
      contents: `
        import { createElement } from 'react';
        import { renderToString } from 'react-dom/server';
        import { CRTImage } from 'crt-shader/react';
        export const html = renderToString(createElement(CRTImage, {
          src: 'https://example.invalid/image.png', alt: 'A pixel-art scene',
          width: 240, height: 120, className: 'art', style: { borderRadius: 4 },
        }));
        export const fluidHtml = renderToString(createElement(CRTImage, {
          src: '/art.png', style: { width: '100%', height: 'auto' },
        }));
      `,
      resolveDir: root,
    },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  const { html, fluidHtml } = module.exports;
  assert.match(fluidHtml, /width:100%/);
  assert.match(fluidHtml, /height:auto/);
  assert.match(html, /^<canvas\b/);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="A pixel-art scene"/);
  assert.match(html, /class="art"/);
  assert.match(html, /width:240px/);
  assert.match(html, /height:120px/);
  assert.match(html, /border-radius:4px/);
  assert.doesNotMatch(html, /<img|<script|<link/);
});
