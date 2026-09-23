# Release notes

Run `pnpm changeset` for changes to the published `crt-shader` package. Choose a patch for compatible fixes, minor for compatible additions, or major for breaking changes, and write a user-facing release note. Commit the generated Markdown file with the change.

Documentation-site, test and workflow changes do not need a package release. Do not add a version bump just to deploy the site.

After changesets reach `main`, GitHub Actions opens or updates a **Release crt-shader** PR. Review its versions and changelog; merging that PR authorizes npm publication. The workflow verifies the package before publishing through npm trusted publishing and creates the GitHub release.

See [Contributing](../docs/CONTRIBUTING.md#releases) for setup, verification and recovery. This directory intentionally contains no initial release changeset: installing the automation must not publish a new version.
