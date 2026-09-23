# Image sources

Local study images reproduced from [The Effect of CRTs on Pixel Art](https://datagubbe.se/crt/) and [its follow-up](https://datagubbe.se/crt2/). Artwork remains the property of its original creators; these are not original or newly licensed assets.

- CRT reference: `https://datagubbe.se/crt/rpg_compare.png`, native crop `[430,0,853,257)`. No retouching. The photograph is never supplied to the reconstruction shader.
- Peach source: `https://datagubbe.se/crt2/peach2.png`, native sprite bounding box plus eight pixels of black padding.
- Ruff ’n’ Tumble: `https://datagubbe.se/crt/rnt_title.png`, main-art crop `[0,0,444,434)`, reduced from the article’s nearest-neighbor enlargement.
- Silkworm: `https://datagubbe.se/crt/silkworm.png`.
- Maniac Mansion: `https://datagubbe.se/crt/maniac.png`.
- Mayhem in Monsterland: `https://datagubbe.se/crt/mayhem_in_monsterland.png`.
- Monkey Island: `https://datagubbe.se/crt/mi_org__b.png`.
- Dither and anti-aliasing demonstration: `https://datagubbe.se/crt/dith_anti.png`.
- Toki Tori: `https://datagubbe.se/crt2/tokitoribig.png`.
- Kirby’s Dream Land: `https://datagubbe.se/crt2/kirbtybig.png`.
- Gremlins 2: `https://datagubbe.se/crt2/grembig.png`.
- Trip World: `https://datagubbe.se/crt2/tripworldbig.png`.

The source manifest records dimensions and exact repeated-pixel factors. Only verified integer enlargement is removed; the Monkey Island source is left at its supplied resolution. Source screenshots can contain intentional game HUDs or drawing-program chrome.

# Native sprite examples

- Six unscaled 16×16 food sprites from [Free Pixel Food! by Henry Software](https://henrysoftware.itch.io/pixel-food), downloaded through the creator's free download flow. The asset page identifies the sprites as CC0. The original 128×128 atlas is retained as `assets/itch-food-sheet.png`.
- Three unscaled 16×16 characters from [Tiny Dungeon by Kenney](https://kenney.nl/assets/tiny-dungeon), CC0. Original tile IDs 84, 96 and 110; the included license is retained as `assets/kenney-license.txt`.
- Each sprite has eight pixels of black padding added around it, without changing its native artwork pixels. Details and creator links are recorded in `assets/detail-sources.json`.

Pixel detail view uses the same centered, up-to-48×48 native-pixel window for every ordinary image. The shader still samples the full source, including neighbors outside that window. Whole image view remains available. This changes inspection scale, not preset strength or per-image calibration. The photographic calibration row always retains its original registered crop.

# Frozen renderer

## Photo preprocessing

Photographs are progressively downsampled to the selected longest-edge resolution before being uploaded as the shader's input texture. The original photo stays on the left; the right receives low-resolution input followed by the unchanged CRT shader. Full color is retained. Photo aspect ratio and displayed size stay fixed while resolution changes. Existing pixel-art inputs and the Reference preset are not changed.

Choose **Import as photo** (the default) or **Import as pixel art** before adding, dropping, or pasting images. Every import route uses that same choice. Each uploaded row also has a Photo/Pixel art selector, so the input pipeline can be corrected without re-uploading. Files remain local to the browser; the original decoded image is retained for reprocessing. The mode selection never changes the frozen CRT preset.

Sample photos supplied by [Lorem Picsum](https://picsum.photos/), with original photographer/source metadata retained in `assets/photo-sources.json`:

- Coastal forest: [Paul Jarvis](https://unsplash.com/photos/6J--NXulQCs).
- Sunlit portrait: [Alexander Shustov](https://unsplash.com/photos/AHBiSKaENwc).
- Black dog: [André Spieker](https://unsplash.com/photos/8wTPqxlnKM4).
- Pour-over coffee: [Karl Fredrickson](https://unsplash.com/photos/TYIzeCiZ_60).

## Presets

`presets.js` exports four immutable presets: Soft, Clean, Photo soft, Reference. Reference is the approved Article crisp preset, unchanged. UI adjustments operate on copies; Reset restores the frozen values.

`shaders.js` preserves the approved GLSL verbatim. `calibration/approved-reference.html` preserves the approved single-image page. The first gallery row uses the original fixed registration and 423 × 257 framebuffer so its pixels can be compared directly. All remaining rows apply the same selected shader to their own input, without the Peach crop.
