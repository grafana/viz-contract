# Testing contributions

Read the checked-in [frontend testing strategy](../.claude/skills/frontend-testing-strategy/SKILL.md).
For chart rendering and interactions, also read the
[panel testing strategy](../.claude/skills/panel-testing-strategy/SKILL.md).
These Markdown guides require no agent installation or private access. Local commands and fixtures
below specialize those principles. Provenance and content hashes live in
[shared-testing-source.json](../.claude/skills/shared-testing-source.json); publication of the shared
source is pending. Update shared copies together through reviewed PRs, preserving the adjacent license.


## Contract and tooling

Use Node 22 or newer. From `scripts/`, install with `npm ci --ignore-scripts`.
From the repository root, run `node scripts/generate.mjs` after registry/schema changes, then
`node scripts/check.mjs`. Review generated diffs alongside source changes.

Add positive and negative fixtures for changed contract rules. Keep expected values independent of
the validator under test. For tooling changes, run `npm test` from `scripts/` and cover regressions
in the production scripts. This repository has no React UI; frontend rendering and browser guidance
applies to consumers implementing the contract, not to contract-only changes.

Follow CONTRIBUTING.md for version labels, public-text checks, and compatibility promises.
