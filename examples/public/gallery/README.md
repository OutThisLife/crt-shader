# Gallery data

`manifest.json` mirrors `examples/gallery-inventory.json`. Keep them identical when changing an image. The gallery retains its original ordering, with `brooklyn-selfie` replacing `photo-64`.

## Rendering

- Read rows from `manifest.rows`. Use `id` as the key, `title` as the label, and `url` as the image source.
- `crop` is `[x, y, width, height]`. Apply it before unscaling. `nativeDimensions` includes any baked-in padding.
- Food and Kenney sprites already have eight black pixels of padding. The Peach reference uses its recorded crop and view.
- For photos, keep the full source in the before panel and reduce a separate shader input to a 96-pixel longest edge.
- Apply the `reference` preset. `articleReference` supplies comparison imagery, separate from the shader input.

## Updating images

Update the row, source record, asset hash, and byte counts together. Brooklyn's selfie is the unfiltered panel from her [comparison post](https://x.com/imbabybrooklyn/status/2102090214940262413); `downloadCrop` records its bounds within the posted image.

`originalSample` and `originalEvidence` describe the original lab. `verification.json` records that earlier recovery, not the current edited gallery. Asset hashes in the manifest describe the current files.

[Image rights](./RIGHTS.md) lists attribution and licensing. Gallery assets are excluded from the npm package.
