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
7. Describe the change in the pull request. Do not describe it in the contract text. The contract text has no
   change history and no build status.
8. If you changed a registry or a schema, run `node scripts/generate.mjs`. It writes the generated parts of
   the schemas, the bundled schemas and the constants table of `README.md`.
9. Run the checks: run `npm ci --ignore-scripts` in `scripts` once, then run
   `node scripts/check.mjs`. Fix each failure. CI runs the same checks on each pull request.

## Version and changelog

A change pull request does not change `CHANGELOG.md` or the version in `package.json`. Thus two open pull requests
do not conflict on the version. A release pull request changes them.

In each change pull request:

1. Find the kind of the change with the rules of `8-versioning.md`: major, minor or patch.
2. Add one label for the kind: `version:major`, `version:minor` or `version:patch`. Add the label `version:none` if
   the change needs no release, for example a change to CI, to `scripts/` or to the README. Renovate adds
   `version:none` to its pull requests.
3. Also add the label `version:internal` if the change affects only an interface with the internal or the
   provisional promise.

The check `Version label` fails until the pull request has valid labels. A pull request with a failed check cannot
merge.

To make a release:

1. List the pull requests merged since the last tag, for example with
   `gh pr list --state merged --search "merged:>=<date of the last tag>" --json number,title,labels`.
2. Pick the new version from the largest `version:` label in the list. The release is `internal` if each change in
   it has the label `version:internal` or `version:none`.
3. Open a release pull request with the label `version:none`. It adds one `CHANGELOG.md` entry for the new version,
   made from the descriptions of the pull requests, and sets the same version in `package.json`. The checks fail if
   the two versions are different.
4. Merge the release pull request. The release workflow then does these steps on the merge commit:
   - It computes the version from the labels of the pull requests merged since the last tag. It stops if a pull
     request has no valid labels, or if the version is not the version in `package.json`.
   - It runs the checks and creates the tag `v<version>`, for example `v1.2.0`.
   - It publishes the npm package `@grafana/viz-contract`.

Do not tag by hand, and do not move or reuse a tag. If the publish step fails, re-run the failed job of the release
workflow.

## Tell the consumers

Consumers use the files of a tagged version. If the change affects a schema, a registry or a fixture, open an
issue in each repository that implements the contract: `grafana/mcp-grafana` for the Source and the App, and the
repository of the Renderer. The issue links the pull request of the change.

## Public text

The contract is public. Link only public sources: the Grafana source code and docs, the MCP and MCP Apps
specifications, the dataplane contract, and the public mcp-grafana code and docs. Do not link private
repositories or internal documents. The check command includes a public text check.
