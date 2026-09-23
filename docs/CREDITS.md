---
title: "Credits and provenance"
description: "Shader authorship, article inspiration, and the separate rights of reference images and artwork."
---

## Code

**Brooklyn ([OutThisLife](https://github.com/OutThisLife))** implemented the reconstruction shaders, rendering pipeline, framework adapters and package. The canonical [`shaders.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/shaders.js) and [`presets.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/presets.js) preserve the approved study implementation and appearance. Raw `.glsl` files are generated from those JavaScript shader strings, not from an external shader project.

This project's original code is MIT-licensed. The distributed [LICENSE](https://github.com/OutThisLife/crt-shader/blob/main/LICENSE) contains the legal terms; [NOTICE.md](https://github.com/OutThisLife/crt-shader/blob/main/NOTICE.md) records attribution. Copies and ports, including extracted GLSL, must retain the applicable copyright and permission notice. Keep the provenance notice alongside them. Do not infer a license for other material from the package's `license` field.

## Visual inspiration

Datagubbe's articles prompted the visual study:

- [The Effect of CRTs on Pixel Art](https://datagubbe.se/crt/)
- [The Peach meme: On CRTs, pixels and signal quality (again)](https://datagubbe.se/crt2/)

These are visual references and article inspiration. **Datagubbe is not the author of this shader or package.** A reference photograph was used to evaluate/calibrate the appearance; it is not sampled by the shader at runtime. The `reference` preset is an artistic reconstruction, not a promise to simulate a particular physical CRT or reproduce every photographed image.

## Third-party material

Article text, photographs, game screenshots and sprites remain the property of their respective authors/rightsholders. Linking an article or studying its images does not license those images for redistribution, and this project's MIT license does not relicense them.

The standalone package must exclude the original lab's article images, game artwork, calibration pages and gallery assets. Keep examples procedural or use assets with separately documented redistribution rights. If adding an asset, record the creator, source URL, actual license and any crop/downsampling changes next to it; preserve any required notices. Never label a mixed asset collection as MIT merely because the rendering code is MIT.
