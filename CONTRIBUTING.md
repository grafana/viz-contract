# Contributing to the contract

This file gives the steps to change the contract.

## Before you start

1. Read [README.md](README.md) and [8-versioning.md](8-versioning.md).
2. Find the interface that the change affects, and find its promise in `8-versioning.md`.

## Make the change

1. Open one pull request for one change.
2. Change the prose, the schemas, the registries and the fixtures in the same pull request. A change to a shape
   is not complete without the change to its fixtures.
3. If the change adds a panel type, a chart, an error or a notice, add a row to the registry file. Do not add a
   section.
4. Give each new rule a new ID. Do not change the meaning of an existing ID. Do not use the ID of a removed rule
   again.
5. Write a fixed value in `registry/constants.json` only. The prose names the constant and does not write the
   value.
6. Write the prose in plain English: short sentences, active voice, and one term for each concept. The terms are
   in [README.md](README.md).
7. Describe the change in [CHANGELOG.md](CHANGELOG.md) and in the pull request. Do not describe it in the
   contract text. The contract text has no change history and no build status.
8. If you changed a registry or a schema, run `node scripts/generate.mjs`. It writes the generated parts of
   the schemas, the bundled schemas and the constants table of `README.md`.
9. Run the checks: run `npm ci --ignore-scripts` in `scripts` once, then run
   `node scripts/check.mjs`. Fix each failure. CI runs the same checks on each pull request.

## Version and changelog

1. Pick the version number with the rules of `8-versioning.md`: major, minor or patch.
2. Add an entry to `CHANGELOG.md` under the new version. If the change affects only an interface with the
   internal or the provisional promise, mark the entry `internal`.
3. After the merge, tag the commit `contract-<version>`, for example `contract-1.1.0`.

## Tell the consumers

Consumers copy the files of a tagged version. If the change affects a schema, a registry or a fixture, open an
issue in each repository that implements the contract: `grafana/mcp-grafana` for the Source and the App, and the
repository of the Renderer. The issue links the pull request of the change.

## Public text

The contract is public. Link only public sources: the Grafana source code and docs, the MCP and MCP Apps
specifications, the dataplane contract, and the public mcp-grafana code and docs. Do not link private
repositories or internal documents. The check command includes a public text check.
