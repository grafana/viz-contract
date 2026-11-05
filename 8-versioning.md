# 8. Versioning

The contract has a semver version, for example `1.0.0`. Each version has a tag `v<version>`, for example `v1.0.0`, and an entry in
[CHANGELOG.md](CHANGELOG.md). The npm package and the Go module use the same tags. Thus a new major version from 2
on also changes the Go module path, for example to `github.com/grafana/viz-contract/v2`.

## Version rules

- `version.1` A breaking change to a frozen interface makes a new major version. A breaking change is a removed or
  renamed field, a new meaning of a field or a value, or a new required field.
- `version.2` An additive change makes a new minor version. An additive change is a new optional field, a new
  registry row, a new rule, or a new value of a changeable constant.
- `version.3` A change to an interface with the provisional or the internal promise makes a new minor version,
  also if it is breaking. Its changelog entry is marked `internal`.
- `version.4` A change of text that changes no rule makes a new patch version.
- `version.5` A rule ID never gets a new meaning. A removed rule keeps its ID out of use.
- `version.6` A consumer ignores the fields that it does not know. Thus an additive change does not break it.

## The three promises

- `version.7` Provisional: the shape can change in any minor version, with an `internal` changelog entry and no
  deprecation period.
- `version.8` Frozen: a change can only add. A removal, a rename or a new meaning needs a new major version and a
  deprecation period. In the period, the component accepts the old form and the new form. The schema marks the old
  form with `"deprecated": true`, and the changelog names the version that removes it. The period lasts
  `deprecationDays` or more.
- `version.9` Internal: the shape can change in any minor version, with an `internal` changelog entry and no
  deprecation period. The components of the change ship together, so they are never out of step.

## The promise of each interface

| Interface | Promise |
| --------- | ------- |
| Tool arguments | Provisional until the first tagged mcp-grafana release that contains the Source. Frozen from that release |
| Tool result | Internal |
| Viz spec | Internal. Frozen when the Renderer loads from a CDN |
| Renderer API | Internal. Frozen when the Renderer loads from a CDN |
| Saved panel JSON | Frozen when save ships |

- `version.10` The tool arguments reach consumers that do not ship with mcp-grafana: models, agent prompts and the
  tool lists that a Host keeps. Thus they become frozen first.
- `version.11` While the Renderer is in the mcp-grafana binary, the Source, the App and the Renderer ship together.
  When the Renderer loads from a CDN, an old App can get a new Renderer. Then `specVersion` and the Renderer
  `version` let the App and the Renderer find a mismatch, and the Renderer supports the current `specVersion` and
  the one before it.
- `version.12` A refresh calls `render_grafana_app` with the tool arguments. Thus a refresh has the promise of the
  tool arguments.
