'use client';

import { CRTImage } from 'crt-shader/react';

// An included image: replace this data URL with your own image URL.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="60">
  <path fill="#101018" d="M0 0h96v60H0z"/>
  <path fill="#ef6868" d="M8 8h14v44H8z"/>
  <path fill="#f4ca70" d="M30 8h14v44H30z"/>
  <path fill="#83c99a" d="M52 8h14v44H52z"/>
  <path fill="#7fa7ef" d="M74 8h14v44H74z"/>
</svg>`;
const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;

export default function Artwork({ onLoad, onError = console.error }) {
  return (
    <div style={{ width: '100%', maxWidth: 640, aspectRatio: '8 / 5' }}>
      <CRTImage
        src={src}
        alt="CRT color bars"
        preset="reference"
        width={640}
        height={400}
        dpr={1}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
}
