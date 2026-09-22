# Contribution and release checks

Keep one publishable package in `packages/crt-shader`, private runnable examples in `examples`, and guides in `docs`. Prefer small changes to the existing pipeline over new wrappers or infrastructure. Use the public export routes in examples so package boundaries are exercised.

## Frozen code and generated files

[`shaders.js`](../packages/crt-shader/shaders.js) and [`presets.js`](../packages/crt-shader/presets.js) preserve the approved appearance. Do not reformat, refactor, round values or change kernels while packaging or optimizing. A visual change requires explicit scope and its own before/after review. Performance work should first reduce redundant uploads, allocations and scheduling.

Raw files in `packages/crt-shader/glsl/` come from [`scripts/export-glsl.mjs`](../scripts/export-glsl.mjs). Regenerate rather than hand-edit. The canonical agent guide is [`docs/agents/PORTING.md`](agents/PORTING.md); packaging copies it into the package as `PORTING.md`. Edit only the canonical guide.

Keep docs linked to canonical settings, types and executable examples. Do not copy full implementations into guides. Original lab images/calibration material must stay out of the standalone package; use procedural tests/examples or separately licensed assets with provenance.

## Local commands

Use the pnpm version pinned by [package.json](../package.json).

```sh
pnpm install
pnpm build:glsl
pnpm test
pnpm build
pnpm check
pnpm run pack
```

- `build:glsl`: generate portable shader assets.
- `test`: run root/package checks, React browser regressions and every runnable example's browser tests.
- `build`: regenerate GLSL and build the examples.
- `check`: regenerate GLSL, run tests and build examples.
- `run pack`: make `artifacts/crt-shader-1.0.0.tgz` at the current manifest version. Use **`pnpm run pack`**, not `pnpm pack`: the latter invokes pnpm's builtin on the private workspace root.
- `pnpm dev`: run examples when an interactive server is wanted and authorized.
- `pnpm verify:package`: install the real archive in a clean core-only consumer and prove peer isolation, then install the example peers and run type checks plus every integration's browser tests against that installed package.
- `pnpm run ci`: build and run Node/API/type/SSR checks without a browser. Full GPU checks run separately through `test:browser` and `verify:package`.

The [React browser tests](../packages/crt-shader/tests/react-browser.test.mjs) bundle fixtures in memory and use Playwright request interception, without a separate dev server. They need a browser with WebGL 2. Install Chromium with `pnpm exec playwright install chromium`, or select an installed Chrome with `CRT_TEST_BROWSER_CHANNEL=chrome pnpm test`. `CRT_TEST_ORIGIN` changes the intercepted origin. Do not call a skipped browser run or an unavailable WebGL context a pass.

## Behavioral verification

Passing existing tests is necessary, not proof of a new adapter or port. For an affected rendering path:

1. Run procedural imagery through the real WebGL implementation, not a uniform-only mock. Check nonblank pixels, orientation, alpha and errors.
2. Compare all presets at the same geometry and browser/GPU against the approved path. Preserve frozen shader/preset bytes and actual output. Keep reference assets local; do not ship them as fixtures.
3. Exercise source revisions, effect updates, cropping, native/reduced input, modes, resize and DPR where supported. Measure actual input/output dimensions.
4. For scene adapters verify both composer color paths, terminal and offscreen output, state restoration and caller-resource ownership. For React verify SSR import, StrictMode, source races, lazy/eager behavior and unmount cleanup.
5. Verify resource reuse and disposal. Counters show avoided work, not FPS or GPU time.

The [porting checklist](agents/PORTING.md) provides the cross-engine acceptance criteria. Report exactly what was exercised and any untested routes; a built example is not automatically a browser-verified example.

## Release gate

Do not publish as part of ordinary development or documentation work.

- Review the package export map, optional peers and declared types. Ensure generated GLSL and the generated porting guide are current and the original shader/preset appearance is unchanged.
- Run `pnpm check` and `pnpm run pack`. Inspect the archive contents against the manifest allowlist: code, declarations, GLSL, README, porting guide, LICENSE and NOTICE; no lab/game assets, tests, credentials or dependency tree.
- Install that actual tarball in a clean consumer outside the workspace. Resolve every public route and raw `.glsl` file, type-check representative consumers, and exercise the image and scene adapters in a real browser. Check React SSR imports and peer deduplication. Packing alone does not establish a working consumer.
- Review [credits](CREDITS.md), copyright and license notices. Original code is covered by its distributed MIT license; article/game assets are not relicensed. Confirm any separately added asset rights.
- Check npm authentication with `npm whoami`, verify registry name/version availability and confirm release authorization. `ENEEDAUTH` blocks publication; local metadata does not reserve a name. Never retrieve shell credentials or ask for secrets in chat to bypass this gate.
- Only an explicitly authorized release may publish. Afterward, read back the exact registry package/version and integrity/dist metadata before claiming publication, then verify installation from the registry. Update status text only after that verification.

Keep build/test/pack evidence separate from registry state. An unpublished archive is a valid local deliverable, not an npm release.
