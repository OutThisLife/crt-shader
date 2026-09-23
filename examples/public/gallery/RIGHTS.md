# Gallery image rights and comparison labels

The shader package's MIT license **does not license the third-party images in
this directory**. This inventory grants no new rights. These are byte-preserving
copies of the existing local comparison lab, kept outside the npm package.
Attribution and an accessible download do not establish permission to publish.

## Article/game images and CRT photographs

The image sources are [The Effect of CRTs on Pixel Art](https://datagubbe.se/crt/)
and [The Peach meme: On CRTs, pixels and signal quality (again)](https://datagubbe.se/crt2/).
Original game artwork, article illustrations, and photographs remain with their
respective rights holders. The retained lab supplies no redistribution license
for these images. Review permission or the applicable basis for a public
comparative quotation before broader publication; no fair-use determination is
made here.

The Peach CRT reference is a **photographed display**, not another shader's
output. The first article explicitly corrected its earlier speculation that it
might be a filter. The follow-up traces it to [CRTpixels](https://x.com/CRTpixels/status/1400097860029489152?lang=en)
and identifies an S-Video source. Preserve those distinctions:

- `reference-comparison.png`: the first article's pixelated-source / CRT-photo
  comparison, byte-identical to its `rpg_compare.png` at verification.
- `reference-head.png`: the existing, unretouched right-hand crop,
  `[430,0,423,257]` in x/y/width/height coordinates. Its pixels were verified
  against `reference-comparison.png`.
- `reference-full.jpg`: the follow-up's whole-sprite CRT/LCD comparison,
  byte-identical to its `Super-Mario-RPG2.jpg` at verification. This is contextual
  reference imagery, not the fixed registered calibration crop.
- `peach.png`: the follow-up's `peach2.png`, byte-identical at verification.
  Its palette and some cells differ from the earlier meme's pixelated source.

Do not label article photos “their shader,” present them as calibrated
measurements, or claim these assets prove the “best” shader. Camera focus,
photographic reproduction, signal quality, and source correspondence matter.
The other article rows do not gain a fictitious reference output merely because
the article discusses CRTs. Game Boy / Game Boy Color images are from LCD
handheld systems.

## Henry Software / itch.io

The six native food sprites and `itch-food-sheet.png` originate from
[Free Pixel Food! by Henry Software](https://henrysoftware.itch.io/pixel-food).
The creator's page identifies the **asset license as CC0**. The separate “MIT
License” field is a **code license**, not a reason to relabel this artwork MIT.
The original 128×128 atlas is retained. Each gallery image is the original lab's
16×16 crop with eight pixels of black padding; no native artwork is enlarged.

## Kenney

The three native sprites originate from [Tiny Dungeon by Kenney](https://kenney.nl/assets/tiny-dungeon),
CC0. The original included notice is retained byte-for-byte at
[`assets/kenney-license.txt`](./assets/kenney-license.txt). The historical source
record lists tile IDs 84, 96 and 110 for the group but does not explicitly map
each ID to a row. The inventory does not invent that mapping.

## Photographs

The four actual photographs and original photographer, Unsplash source, and
Lorem Picsum download URLs are retained in `assets/photo-sources.json`:

- Paul Jarvis — [Coastal forest](https://unsplash.com/photos/6J--NXulQCs)
- Alexander Shustov — [Sunlit portrait](https://unsplash.com/photos/AHBiSKaENwc)
- André Spieker — [Black dog](https://unsplash.com/photos/8wTPqxlnKM4)
- Karl Fredrickson — [Pour-over coffee](https://unsplash.com/photos/TYIzeCiZ_60)

The [Unsplash license](https://unsplash.com/license) is distinct from MIT and
CC0. It generally permits use subject to its restrictions, including restrictions
on selling unmodified images and building a competing image service. The
archived source metadata is not independent proof of per-file ownership or
model/property/trademark releases; those remain unverified. No generated
photographs or lookalike images replace the originals.

## Diagnostics and package boundary

The four procedural diagnostic rows are the outputs of the original lab's
`patterns.js`, retained as such rather than represented as third-party art.
All gallery files, attribution, and calibration evidence stay in the separate
examples site. Do not add any gallery path to the library package's `files`
allowlist or publish these assets as part of the npm package.
