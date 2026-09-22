import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CRTImage } from '../react.js';
import { acquireRuntime } from '../core.js';

const root = createRoot(document.querySelector('#root'));
const sources = {};
const loads = [];
const errors = [];
let contextCount = 0;
let disposedCount = 0;
const contexts = new WeakSet();
const uploads = [];
const activeObservers = new Set();
let observerEvents = 0;
const NativeIntersectionObserver = window.IntersectionObserver;
window.IntersectionObserver = class extends NativeIntersectionObserver {
  constructor(callback, options) {
    super((...args) => { observerEvents++; callback(...args); }, options);
  }
  observe(target) { activeObservers.add(this); super.observe(target); }
  disconnect() { activeObservers.delete(this); super.disconnect(); }
};
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
  const context = originalGetContext.call(this, kind, ...options);
  if (kind === 'webgl2' && context && !contexts.has(context)) {
    contexts.add(context);
    contextCount++;
    const texImage2D = context.texImage2D.bind(context);
    context.texImage2D = (...args) => {
      if (args.length === 6) uploads.push({ width: args[5].width, height: args[5].height });
      return texImage2D(...args);
    };
    const getExtension = context.getExtension.bind(context);
    context.getExtension = name => {
      const extension = getExtension(name);
      if (name === 'WEBGL_lose_context' && extension && !extension.__tracked) {
        extension.__tracked = true;
        const loseContext = extension.loseContext.bind(extension);
        extension.loseContext = () => { disposedCount++; loseContext(); };
      }
      return extension;
    };
  }
  return context;
};

function source(name, width = 23, height = 11, color = '#ff4040') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#80ffc0';
  context.fillRect(1, 2, 4, 3);
  context.fillStyle = '#001030';
  context.fillRect(width / 2, 0, 3, height);
  sources[name] = canvas;
  return canvas.toDataURL();
}

window.fixture = {
  source, sources, loads, errors, uploads,
  get observerEvents() { return observerEvents; },
  get activeObservers() { return activeObservers.size; },
  async settleImage(url) {
    const lease = acquireRuntime();
    try { await lease.runtime.loadImage(url); }
    finally { lease.release(); }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
  get contextCount() { return contextCount; },
  get disposedCount() { return disposedCount; },
  render(rows) {
    flushSync(() => root.render(createElement(StrictMode, null,
      ...rows.map(({ key, source: sourceName, top = 0, ...props }) => createElement('div', {
        key, style: { marginTop: top },
      }, createElement(CRTImage, {
        ...props, src: sourceName ? sources[sourceName] : props.src,
        className: key, onLoad: detail => loads.push({ key, width: detail.width, height: detail.height }),
        onError: error => errors.push({ key, message: error.message }),
      }))),
    )));
  },
  snapshot(key) {
    const canvas = document.querySelector(`canvas.${key}`);
    const rect = canvas.getBoundingClientRect();
    return {
      width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height,
      pixels: Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data),
    };
  },
};
source('red');
source('blue', 23, 11, '#3030ff');
