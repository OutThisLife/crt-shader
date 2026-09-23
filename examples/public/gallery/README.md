# Original CRT gallery inventory

`manifest.json` is the browser-served copy of `examples/gallery-inventory.json`.
Both contain the same object with `schemaVersion`, `rowCount`, `categoryCounts`,
`reconstruction`, `rows`, `assets`, `rightsWarnings`, and `originalEvidence`.

The **29 rows** retain the original `gallery.js` builder order: one photographic
reference row, four real photographs, four procedural diagnostics, six Henry
Software itch.io sprites, three Kenney sprites, and eleven article-art rows.
No Petdex, SHARP, or splat examples are included.

## Consumer contract

- Iterate `manifest.rows`; use `id` as the stable identifier and `title` for the
  exact original title. `url` is a site-root-relative source image URL, or the
  actual original generator's PNG data URL for a diagnostic. No new diagnostic
  design or photographic substitute was created.
- `originalSample` preserves the lab descriptor verbatim. Its URLs are **old
  lab-relative paths**, not URLs to resolve against the new document.
- `crop` is `[x, y, width, height]` in original image pixels. Crop, then remove
  the recorded `unscaleFactors` with nearest-neighbor sampling onto black.
  `nativeDimensions` records the actual original gallery's shader-input size,
  including baked-in padding. It is not necessarily a hardware-native raster.
- Peach resolves to `[132,58,35,49]`; its visible-art bounding box is
  `[140,66,19,33]`. Do not crop the prepared 35×49 texture a second time.
- Food and Kenney image files already include eight black pixels of padding
  around their native 16×16 artwork; do not add more. Food atlas crops were
  matched against the retained original atlas at the pixel level.
- For `photo: true`, keep the full original as the before image. Progressively
  downsample a separate shader input to a 96-pixel longest edge using the
  existing photo-input helper, without quantization. Preserve original photo
  aspect ratio rather than applying historical pixel-art aspect correction.
- Every row uses `reconstruction.preset: "reference"` and the exact top-level
  `reconstruction.settings`. There are no per-image effect overrides. The
  settings equal the package's unchanged approved Article crisp preset.
- Only `reference: true` uses the fixed registered view and 423×257 output.
  `articleReference` is separate source/reference metadata, **not shader input**.
  The photograph is never blended into, sampled by, or substituted for the
  reconstruction. Ordinary rows use their whole prepared source.
- A third-party article's source screenshot is not “their shader output.” Only
  rows with `articleReference` have a retained separate photographic comparison.
  Display the provided limitations and source links with those comparisons.

Suggested article heroes: `reference` for the registered comparison, `peach` for
whole-sprite context, `ruff` for dithering/AA, and `gremlins` / `tripworld` for
small details. The last two come from LCD handhelds, not historical CRT systems.
These are editorial selections, not a measured shader ranking.

## Verification and limits

The unmodified original gallery was executed in real Chrome, with local files
provided by Playwright request interception and no HTTP server. Its actual row
builder produced 29 unique rows and 29 nonblank WebGL outputs. Exact crop/input
sizes and registration were captured at render time, not guessed from HTML
thumbnails. SHA-256 hashes in `assets` attest to byte-preserving copies.

The retained source records contain two important limitations:

1. The later Peach source and earlier meme differ in palette and some source
   cells. `calibration/source-correspondence.json` records 3 mismatched cells
   among 266 tested. Photographic agreement does not establish a calibrated CRT
   simulation, source identity, or superiority to other shaders.
2. Silkworm's original `[2,2]` unscale is preserved for faithful recovery, but
   33,480 pixels fail exact equality within those repeat blocks. The historical
   blanket claim of verified nearest-neighbor enlargement in `SOURCES.md` does
   not apply to that image. See its `unscaleVerification` and `limitations`.

`SOURCES.md`, the three old asset manifests, `patterns.js`, the correspondence
record, and the Kenney license are retained unchanged as original evidence.
Read [RIGHTS.md](./RIGHTS.md) before publishing the separate gallery. None of
this directory belongs in the npm library payload.
