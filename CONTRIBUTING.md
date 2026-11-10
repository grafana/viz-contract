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

A pull request does not change `CHANGELOG.md` or the version in `package.json`. `package.json` keeps the placeholder
version `0.0.0-development`, and the checks fail for any other value. The labels of the pull request give the version.

In each pull request:

1. Find the kind of the change with the rules of `8-versioning.md`: major, minor or patch.
2. Add one label for the kind: `version:major`, `version:minor` or `version:patch`. Add the label `version:none` if
   the change needs no release, for example a change to CI, to `scripts/` or to the README. Renovate adds
   `version:none` to its pull requests.
3. Also add the label `version:internal` if the change affects only an interface with the internal or the
   provisional promise.

The check `Version label` fails until the pull request has valid labels. A pull request with a failed check cannot
merge.

Each merge to `main` makes a release when the labels need one. The release workflow does these steps on the merge
commit:

1. It computes the version from the largest `version:` label of the pull requests merged since the last tag. For
   example, after `v1.2.0` a merged `version:patch` pull request gives `v1.2.1`. If each pull request has
   `version:none`, the workflow stops and makes no release.
2. It runs the checks.
3. It creates the GitHub Release `v<version>` and its tag. The notes come from the titles of the pull requests. The
   release is `internal` if each pull request in it has the label `version:internal` or `version:none`.
4. It publishes the npm package `@grafana/viz-contract` with that version.

Thus the title of a pull request is its line in the release notes. Write it for the consumers of the contract. A
pull request that deprecates a frozen form names the version that removes it in its title, for example
`deprecate the field x, removed in 3.0.0`. Rule `version.8` needs that version in the release notes. If the title
does not name it, edit the notes of the GitHub Release after the release.

Do not tag by hand, and do not move or reuse a tag. If a step fails, re-run the release workflow. A re-run does
not make a second release.

## The consumers

Consumers use the files of a tagged version. Each repository that implements the contract decides when it
supports a new version. The GitHub Release of each version tells the consumers what changed. A pull request of
the contract does not open issues in those repositories.

## Public text

The contract is public. Link only public sources: the Grafana source code and docs, the MCP and MCP Apps
specifications, the dataplane contract, and the public mcp-grafana code and docs. Do not link private
repositories or internal documents. The check command includes a public text check.
