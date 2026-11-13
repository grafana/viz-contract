// Package vizcontract gives the files of the Grafana visualization contract to Go code.
//
// Each folder has its own function. A binary that calls only Registry does not carry the fixtures. They are
// functions, not variables, because a package variable that calls fs.Sub keeps its files in each binary.
// The patterns use all:, so a file whose name starts with . or _ is included, as in the npm package.
// A path does not start with the folder name, for example chart-types.json in Registry,
// viz-spec.schema.json in Schemas and prometheus-line/args.json in Fixtures. These are the paths after the folder
// in the npm package.
package vizcontract

import (
	"embed"
	"io/fs"
)

//go:embed all:registry
var registry embed.FS

//go:embed all:schemas/bundled
var schemas embed.FS

//go:embed all:fixtures
var fixtures embed.FS

// Registry gives the files of registry/.
func Registry() fs.FS { return sub(registry, "registry") }

// Schemas gives the files of schemas/bundled/. Each schema is one file with no reference to another file.
func Schemas() fs.FS { return sub(schemas, "schemas/bundled") }

// Fixtures gives the files of fixtures/. Only tests need it.
func Fixtures() fs.FS { return sub(fixtures, "fixtures") }

// fs.Sub fails only for a path that is not valid. The paths are constants, so a failure is a bug in this file.
func sub(fsys embed.FS, dir string) fs.FS {
	s, err := fs.Sub(fsys, dir)
	if err != nil {
		panic(err)
	}
	return s
}
