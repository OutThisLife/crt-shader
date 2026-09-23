---
title: "Contributing"
description: "Local setup, rendering checks and manual releases."
---

The library is in `packages/crt-shader`, runnable examples in `examples`, and documentation in `docs`. Examples use public package exports.

## Frozen code and generated files

Leave [`shaders.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/shaders.js) and [`presets.js`](https://github.com/OutThisLife/crt-shader/blob/main/packages/crt-shader/presets.js) unchanged during packaging or optimization, including formatting and numeric values. Visual changes require explicit approval and before/after review. Start performance work with redundant uploads, allocations and scheduling.

`pnpm build:glsl` runs [`scripts/export-glsl.mjs`](https://github.com/OutThisLife/crt-shader/blob/main/scripts/export-glsl.mjs) to generate `packages/crt-shader/glsl/`. Packaging also copies [`docs/agents/PORTING.md`](/agents/PORTING/) into the package. Edit the source files, not generated copies.

## Local commands

Use the pnpm version pinned by [package.json](https://github.com/OutThisLife/crt-shader/blob/main/package.json).

```sh
pnpm install
pnpm docs:dev
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run standalone examples |
| `pnpm docs:dev` | Run docs at `http://127.0.0.1:3000/` |
| `pnpm build:glsl` | Regenerate raw shader files |
| `pnpm build` | Generate GLSL and build examples and docs |
| `pnpm test` | Run Node tests and browser tests for React and the examples |
| `pnpm check` | Build and run all tests |
| `pnpm run ci` | Build and run Node tests without browser tests |
| `pnpm run pack` | Create `artifacts/crt-shader-<version>.tgz` |
| `pnpm verify:package` | Pack and install in a clean consumer; check peer isolation, types and browser integrations |

Use `pnpm run pack`; `pnpm pack` invokes pnpm's built-in command on the private workspace root. Install the archive in another project with `pnpm add /absolute/path/to/crt-shader/artifacts/crt-shader-1.0.0.tgz`, adjusting the version as needed.

Browser tests require WebGL 2. Install Chromium with `pnpm exec playwright install chromium`, or use an installed Chrome with `CRT_TEST_BROWSER_CHANNEL=chrome pnpm test`. Report skipped tests and unavailable WebGL contexts.

## Documentation

The [live site](https://crt-shader.vercel.app/) uses [Astro Starlight](https://starlight.astro.build/), configured in `docs/astro.config.mjs`. The dev server requires port `3000` to be free.

Edit guides in `docs/`; `docs/src/content.config.ts` loads them directly. Quickstarts run and display the same modules in `examples/quickstart/`. The adapter comparison uses `examples/src/`, and the porting page imports `docs/agents/PORTING.md`. Gallery assets come from `examples/public/`. Raw GLSL guides stay in the repository, outside the site navigation and search.

`pnpm docs:build` writes `docs/dist/` and builds the Pagefind search index. Use `pnpm --dir docs preview` to inspect that build. Vercel runs `pnpm run ci` and serves `docs/dist/`.

## Rendering changes

- Exercise the changed path in WebGL 2 with procedural imagery. Check pixels, orientation, alpha and errors.
- Compare all presets against the approved output at matching geometry on the same browser/GPU.
- Cover source updates, cropping, input resolution, modes, resize and DPR where supported.
- For scene adapters, check color handling, screen/offscreen output, renderer-state restoration and caller-owned resources. For React, check SSR, StrictMode, source races, loading behavior and cleanup.
- Check resource reuse and disposal. Report untested paths.

See the [porting checklist](/agents/PORTING/) for acceptance criteria. Keep reference images out of test fixtures and the published package; document rights for any added assets in [Credits](/CREDITS/).

## Releases

Releases are manual and require explicit authorization. GitHub Actions and release automation are not configured.

1. Review exports, optional peers and types. Regenerate GLSL and the packaged porting guide without changing shader or preset source.
2. Run `pnpm check` and `pnpm verify:package`. Inspect the tarball against the package manifest's file allowlist, including LICENSE and NOTICE. Exclude lab/gallery assets, tests, credentials and dependencies.
3. Review [credits](/CREDITS/) and asset rights. Check npm authentication with `npm whoami` and confirm the intended version is available to publish.
4. After publication, verify the exact registry version and integrity metadata, then install it in a clean consumer.
