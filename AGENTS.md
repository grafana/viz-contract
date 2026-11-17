# Agent guidance

## Contribution workflow

Read [CONTRIBUTING.md](CONTRIBUTING.md) and applicable directory instructions before editing.
Keep changes focused and follow surrounding conventions. Add comments for non-obvious reasons,
not to narrate self-explanatory code. Follow CONTRIBUTING.md for generation and validation commands.

Use the contributor's configured signing identity for every commit. Never disable signing to get
past an error or fabricate an identity. Preserve authorship; get explicit approval before rewriting
published history. Follow the signing setup in CONTRIBUTING.md.

Before `git push`, stop, summarize changes and validation, and obtain explicit human approval.
A request to open a PR does not by itself authorize pushing. Report unavailable or skipped checks.

## Repository essentials

Read README.md, CONTRIBUTING.md, and `8-versioning.md` before contract changes.
Change prose, schemas, registries, and fixtures together. Never reuse rule IDs or change an existing
ID's meaning. Define constants in `registry/constants.json`; regenerate derived outputs rather than
editing them by hand. Preserve compatibility promises and document affected consumers in the PR.

Use the existing version labels and release process. Do not manually edit the placeholder package
version, CHANGELOG.md, or release tags. Contributors without label permissions should state the
required labels in the PR and ask a maintainer to apply them.

All references must be public. This repository defines the contract; implementations live in consumer
repositories. Validate contract changes with the schema and fixture checks described in CONTRIBUTING.md.
