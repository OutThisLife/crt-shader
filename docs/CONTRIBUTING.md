---
title: "Contributing"
description: "Local setup, rendering checks and automated releases."
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

Releases use [Changesets](https://changesets.dev/guide/automating) and GitHub Actions. Merging the **Release crt-shader** PR authorizes publication; ordinary documentation changes only deploy the site.

### Contributing a package change

1. Run `pnpm changeset`, select `crt-shader`, choose the version bump and write a user-facing release note. Commit the generated `.changeset/*.md` with your change. Use **patch** for compatible fixes, **minor** for compatible additions, and **major** for breaking changes. Tests, workflow changes and site-only docs do not need a changeset.
2. CI builds the examples and docs, runs the complete Node/Chrome test suite, and installs the packed package in a clean consumer to verify types, optional peers and browser integrations. Shader and preset checks still enforce the approved source bytes.
3. After merging to `main`, the release workflow opens or updates `changeset-release/main`. Changesets updates the package version and `packages/crt-shader/CHANGELOG.md`; the version script also refreshes the lockfile. Private workspaces are not released.
4. Review the generated release PR and its CI run before merging. Its merge runs verification again, packs the release, and publishes those tarballs from a separate job using npm OIDC. Only that job has `id-token: write`; no npm token is stored in GitHub.
5. Check the npm version/provenance and the generated GitHub release after publication. Future workspace release tags use `crt-shader@<version>`; the existing `v1.0.0` release is preserved.

The workflow explicitly dispatches CI for generated release PRs because [PR runs created with `GITHUB_TOKEN` can require approval](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow). Actions are pinned to commits, release runs are serialized, and dependency caches are disabled for release jobs. No workflow publishes from a PR or a non-`main` dispatch.

### One-time trusted publisher setup

- In GitHub **Settings → Actions → General**, enable **Allow GitHub Actions to create and approve pull requests**. Keep default workflow permissions read-only; each job declares the access it needs.
- Create the GitHub environment `npm` and restrict its deployment branches to `main`.
- In the [npm package settings](https://www.npmjs.com/package/crt-shader/access), add a GitHub Actions trusted publisher with these exact fields:

| Field | Value |
| --- | --- |
| Organization or user | `OutThisLife` |
| Repository | `crt-shader` |
| Workflow filename | `release.yml` |
| Environment | `npm` |
| Allowed actions | Enable direct `npm publish` |

New npm trusted publishers allow staged publishing by default, but Changesets needs direct publishing. See [npm's trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/). Use Node 24 with npm 11.5.1 or newer. OIDC automatically includes provenance for this public package and repository.

After saving and checking that binding, set the repository Actions variable `NPM_TRUSTED_PUBLISHING` to `enabled`. Until then, the publish job fails before invoking npm; version PRs and CI can still run. Keep this gate disabled if setup is incomplete. Do not add an npm token as a workaround.

### Verification and recovery

Run `pnpm check` and `pnpm verify:package` locally before releasing (`CRT_TEST_BROWSER_CHANNEL=chrome` selects an installed Chrome). The archive name follows the current package version. Inspect its file allowlist, LICENSE, NOTICE and [asset rights](/CREDITS/); gallery assets must stay out of the package.

`pnpm exec changeset publish-plan` checks which versions need publication without publishing. With no pending changesets and the current version already on npm, the workflow does nothing beyond verification. Documentation changes do not republish an existing version.

If a publish fails, fix the reported cause and rerun the **Release** workflow on `main`; never bump a version solely to retry. Check npm and the existing tag/release first if a failure occurred after upload. npm versions are immutable, and a partially completed GitHub release may need to be reconciled separately. `npm whoami` is not an OIDC test: authentication is exchanged only during publishing. A successful no-op or dry run does not prove the first real OIDC publish.
