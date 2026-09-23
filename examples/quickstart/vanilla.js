import { createRuntime, prepareInput } from 'crt-shader';

export function mount(host) {
  const source = document.createElement('canvas');
  source.width = 96;
  source.height = 60;
  const ctx = source.getContext('2d');
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, 96, 60);
  ['#ef6868', '#f4ca70', '#83c99a', '#7fa7ef'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(8 + i * 22, 8, 14, 44);
  });

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'CRT color bars');
  canvas.style.cssText = 'display:block;width:100%;height:auto';
  host.append(canvas);
  const runtime = createRuntime();
  const ready = runtime.render({
    source: prepareInput(source), output: canvas,
    preset: 'reference', width: 640, height: 400,
  });

  return {
    canvas, ready,
    dispose() {
      runtime.dispose();
      canvas.remove();
    },
  };
}
