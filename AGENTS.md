# Agent guidance

This repository defines the contract. Implementations live in consumer repositories.

## Every change

- Change affected prose, schemas, registries, and fixtures in one PR.
- Give a new rule a new ID. Never reuse a removed ID or change an existing ID's meaning.
- Write fixed values only in `registry/constants.json`.
- Do not hand-edit generated output (`schemas/bundled/`, the constants table in README.md).
  Run `node scripts/generate.mjs`. Inspect relevant generated diffs instead of reading all output.
- Read one fixture set as an example, not the whole `fixtures/` directory.
- Validate: `npm ci --ignore-scripts` in `scripts` once, then `node scripts/check.mjs` from the root.
- Do not edit CHANGELOG.md, the package version, or tags. State the needed `version:` label in the PR.

## Read only when needed

- Editing contract prose or adding a registry entry: [Make the change](CONTRIBUTING.md#make-the-change).
- Change to a shape or a compatibility promise: [8-versioning.md](8-versioning.md).
- Choosing the version label: [Version and changelog](CONTRIBUTING.md#version-and-changelog).
- Signing error: [Signed commits](CONTRIBUTING.md#signed-commits). Never disable signing.

## Git

- Sign every commit with the contributor's configured identity.
- Get explicit approval before `git push` and before rewriting published history.
  A request to open a PR does not authorize a push.
- Report checks you skipped or could not run.
