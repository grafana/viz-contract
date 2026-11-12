// Package vizcontract gives the files of the Grafana visualization contract to Go code.
//
// Each folder has its own variable. A binary that uses only Registry does not carry the fixtures.
// The paths in each file system start with the folder name, as in the repository, for example
// registry/chart-types.json, schemas/bundled/viz-spec.schema.json and fixtures/prometheus-line/args.json.
package vizcontract

import "embed"

// Registry holds registry/.
//
//go:embed registry
var Registry embed.FS

// Schemas holds schemas/bundled/. Each schema is one file with no reference to another file.
//
//go:embed schemas/bundled
var Schemas embed.FS

// Fixtures holds fixtures/. Only tests need it.
//
//go:embed fixtures
var Fixtures embed.FS
