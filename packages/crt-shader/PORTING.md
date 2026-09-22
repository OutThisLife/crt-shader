# Porting crt-shader: agent checklist

This is the canonical guide; packaging also copies it to `PORTING.md` beside the installed package sources. **All source filenames below are relative to the `crt-shader` package root**, not this guide's repository directory. In a checkout, that root is `packages/crt-shader/`. Repository-only documentation uses GitHub links so this guide also works in an installed package.

## Before writing code

1. Read `shaders.js`, `presets.js` and the appropriate host: `renderer.js` for image/WebGL ownership or `three-pipeline.js` for GPU-native scene integration. Read `index.d.ts`, `three.d.ts`, `postprocessing.d.ts` and `r3f.d.ts` for supported public contracts. Internal filenames are implementation references, not additional public import routes.
2. State the target engine/API, source type, input/output encoding, alpha policy, incoming buffer dimensions, intended input reduction and resource owner. Missing information is a question to resolve, not an assumption to hide.
3. Decide whether an existing public adapter already fits. Use `crt-shader`, `/react`, `/three`, `/postprocessing` or `/r3f` before building another host. `/glsl` exports named strings; `/glsl/*.glsl` exports generated raw files. ESM TypeScript declarations ship with the package.
4. Read [the full stage contract](https://github.com/OutThisLife/crt-shader/blob/main/docs/glsl.md), [scene color contracts](https://github.com/OutThisLife/crt-shader/blob/main/docs/scenes.md), and [runnable examples](https://github.com/OutThisLife/crt-shader/tree/main/examples). Prefer links to these implementations over copying them into documentation.

## Preserve the appearance

- Keep `shaders.js` and `presets.js` byte-identical for packaging, adapter and performance work. Do not round calibrated values or retune them to hide sampling, framing or color errors. Edit a settings copy, never a frozen preset. Shader/preset changes need explicit authorization and separate visual review.
- Preserve horizontal, vertical and optics as separate passes. Match target dimensions, filters, orientation, source/view/output uniforms, precision, out-of-bounds black and transfer order. `sourceSize` stays the prepared source size in every frozen stage. Use float reconstruction targets when supported; disclose RGBA8 clipping fallback.
- Keep input preparation separate from reconstruction. Image default is native pixel input; photo reduction is explicit. Scene default `'auto'` genuinely downsamples. Offer Source/native input as a numeric longest edge at least as large as the incoming buffer, updated on resize/DPR changes. There is no `'source'` API value. `mode: 'original'` bypasses CRT as well as reduction.
- Preserve black-matte opaque output. Scene-buffer RGB is already composited; do not multiply alpha a second time. All modes write alpha `1`. Transparent pass-through is a different, unimplemented contract.
- Preserve the host's color path: native Three receives/emits display-encoded RGB after `OutputPass`; pmndrs receives tone-mapped linear RGB, encodes before preparation, and decodes only offscreen output for a later screen encode. Avoid double tone mapping/encoding.

## Adapt the host, not the shader

Use the four `glsl/` files or the named strings from `crt-shader/glsl`. In this repository regenerate raw files with `pnpm build:glsl`; do not edit generated copies. A different shading language needs a real translation, explicit render targets and validation. These GLSL ES 3.00 files do not establish WebGPU, Unity or Godot support, and cannot be advertised as a drop-in single-material effect.

For a Three host, preserve the `RawShaderMaterial`/GLSL3 setup and explicit draw range for `a_position`. Remove only the leading version directive when the engine inserts it. Keep the native Three and pmndrs adapter `Pass` bases and buffer argument orders distinct. The R3F component is a pass, not a mergeable pmndrs `Effect`.

Define ownership before allocation. A scene pass borrows the caller's renderer/input/output and frees only its own targets, geometry and materials. Preserve target, viewport/scissor and relevant renderer state. Reuse resources across frames; resize/release them when needed. The image runtime owns a context and copies finished frames to 2D canvases. Preserve source-version invalidation, latest-wins cancellation, shared leases and StrictMode cleanup where applicable.

## Verify before claiming a working port

Use a redistributable procedural input with asymmetric corners, isolated pixels, single-pixel lines, dark regions and saturated colors. Render it through both the canonical implementation and the port at identical geometry and settings.

- Compile and execute every stage on the real target GPU API. Check framebuffer completeness, nonblank RGB, orientation and opaque alpha. Compilation alone is not rendering proof.
- Compare all presets in the same browser/GPU at matched input, view, framebuffer size and DPR. For an unchanged WebGL host, investigate any pixel difference; do not hide it by tuning a preset. A different backend needs a declared, justified tolerance and recorded differences.
- Exercise native and reduced input, every supported mode, crop where supported, option updates/removal, resizing and DPR changes. Confirm actual prepared dimensions as well as changed framebuffer pixels.
- Check on-screen and offscreen color paths. When reading pmndrs screen output, explicitly bind the screen first; restored renderer state may leave an offscreen framebuffer bound.
- Verify resource reuse and disposal, no destruction of caller-owned resources, mutable sources, cancellation and mount/unmount behavior. Test StrictMode and demand rendering for React integrations.
- Run [repository checks](https://github.com/OutThisLife/crt-shader/blob/main/docs/CONTRIBUTING.md), pack, then install the tarball in a separate consumer. Exercise its public routes and raw GLSL assets, not only local source imports. Do not start services, publish or commit unless the task authorizes it.

Report exact files changed, commands actually run, backend/browser/GPU used, comparison results and limitations. Separate source/API inspection from actual framebuffer evidence. Do not invent output, timing results, compatibility or publication status when a tool/environment blocks verification.

## Attribution and distribution

Shader implementation and package: **Brooklyn (OutThisLife)**. Datagubbe's [CRT article](https://datagubbe.se/crt/) and [follow-up](https://datagubbe.se/crt2/) are visual inspiration, not shader authorship or an upstream shader license.

Retain the package's `LICENSE` and `NOTICE.md` when copying original code or raw GLSL, and identify port-specific changes. Article text, reference photographs, game sprites and other third-party assets are not relicensed as MIT. Do not copy the original lab or its assets into a port/package; consult [credits and provenance](https://github.com/OutThisLife/crt-shader/blob/main/docs/CREDITS.md).

A manifest name/version or successful local pack does not prove npm publication or name ownership. Verify credentials and registry state separately, and obtain explicit authorization before publishing.
