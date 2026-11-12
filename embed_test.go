package vizcontract

import (
	"encoding/json"
	"io/fs"
	"path"
	"testing"
)

func readJSON(t *testing.T, fsys fs.FS, name string) {
	t.Helper()
	b, err := fs.ReadFile(fsys, name)
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("parse %s: %v", name, err)
	}
}

// The files that mcp-grafana reads.
func TestRegistry(t *testing.T) {
	for _, name := range []string{"chart-types.json", "pick.json", "constants.json"} {
		readJSON(t, Registry, "registry/"+name)
	}
}

func TestSchemas(t *testing.T) {
	for _, name := range []string{
		"query-datasource-args.schema.json",
		"tool-result.schema.json",
		"viz-spec.schema.json",
		"registry.schema.json",
	} {
		readJSON(t, Schemas, "schemas/bundled/"+name)
	}
}

// A Source fixture set has a response.json. It also has the other files of the Source test (fixtures.8).
// request.json is optional: a pick set has none (fixtures.1).
func TestSourceFixtures(t *testing.T) {
	sets, err := fs.ReadDir(Fixtures, "fixtures")
	if err != nil {
		t.Fatal(err)
	}
	n := 0
	for _, set := range sets {
		dir := path.Join("fixtures", set.Name())
		if _, err := fs.Stat(Fixtures, path.Join(dir, "response.json")); err != nil {
			continue
		}
		n++
		for _, name := range []string{"args.json", "meta.json", "response.json", "result.json"} {
			readJSON(t, Fixtures, path.Join(dir, name))
		}
		if _, err := fs.Stat(Fixtures, path.Join(dir, "request.json")); err == nil {
			readJSON(t, Fixtures, path.Join(dir, "request.json"))
		}
	}
	if n == 0 {
		t.Fatal("no Source fixture set")
	}
}
