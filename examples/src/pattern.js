// Original procedural artwork. No image downloads, gallery assets or font dependency.
export const WIDTH = 384;
export const HEIGHT = 288;

export function createPattern() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 48;
  const context = canvas.getContext('2d');
  context.fillStyle = '#000';
  context.fillRect(0, 0, 64, 48);
  const colors = ['#ee6c62', '#f4c66a', '#96cb80', '#70bfca', '#809cf0', '#c98bc8'];
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(2 + index * 10, 2, 9, 7);
  });
  // A coarse checker beside a single-source-pixel dither patch.
  for (let y = 12; y < 28; y++) for (let x = 2; x < 30; x++) {
    const lit = x < 16 ? ((x >> 2) + (y >> 2)) % 2 : (x + y) % 2;
    context.fillStyle = lit ? '#dfdfd5' : '#243347';
    context.fillRect(x, y, 1, 1);
  }
  // Stepped diamond, stair and isolated dots avoid antialiasing ambiguity.
  context.fillStyle = '#70bfca';
  for (let y = 0; y < 15; y++) {
    const half = 7 - Math.abs(7 - y);
    context.fillRect(44 - half, 12 + y, half * 2 + 1, 1);
  }
  context.fillStyle = '#ee6c62';
  for (let step = 0; step < 6; step++) context.fillRect(3 + step * 4, 41 - step * 2, 4, 4 + step * 2);
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(34 + index * 5, 34, 1, 1);
    context.fillRect(34 + index * 5, 40, 3, 3);
  });
  return canvas;
}
