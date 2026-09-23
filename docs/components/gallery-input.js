import { prepareInput } from 'crt-shader';

export async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export async function prepareGalleryInput(row) {
  const original = await loadImage(row.url);
  if (row.photo) {
    return { original, source: prepareInput(original, {
      inputMode: 'photo', inputResolution: row.reconstruction.inputResolution,
    }) };
  }
  const source = document.createElement('canvas');
  [source.width, source.height] = row.nativeDimensions;
  const context = source.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#000';
  context.fillRect(0, 0, source.width, source.height);
  context.drawImage(original, ...row.crop, 0, 0, source.width, source.height);
  return { original, source };
}

export function outputSize(row) {
  if (row.reconstruction.output) return row.reconstruction.output;
  const [width, height] = row.nativeDimensions;
  const ratio = width / (height * row.reconstruction.pixelAspect);
  // A fixed drawing buffer: resizing the page never changes the reconstruction.
  const outputWidth = Math.max(1, Math.round(Math.min(768, 768 * ratio)));
  return { width: outputWidth, height: Math.max(1, Math.round(outputWidth / ratio)) };
}
