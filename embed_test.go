package vizcontract

import (
	"encoding/json"
	"io/fs"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
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

// A binary that uses only Registry does not carry the fixtures. The test builds a program that reads only
// Registry and a program that also reads Fixtures. The second binary must be larger by about the size of the
// fixtures.
func TestRegistryOnlyBinaryHasNoFixtures(t *testing.T) {
	if testing.Short() {
		t.Skip("builds two binaries")
	}
	goBin, err := exec.LookPath("go")
	if err != nil {
		t.Skip("no go command")
	}
	repo, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}

	var fixtureBytes int64
	err = fs.WalkDir(Fixtures, "fixtures", func(name string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		fixtureBytes += info.Size()
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	build := func(body string) int64 {
		t.Helper()
		dir := t.TempDir()
		goMod := "module sizecheck\n\ngo 1.24\n\nrequire github.com/grafana/viz-contract v0.0.0\n\n" +
			"replace github.com/grafana/viz-contract => " + strconv.Quote(repo) + "\n"
		main := "package main\n\nimport vizcontract \"github.com/grafana/viz-contract\"\n\nfunc main() {\n" + body + "}\n"
		for name, text := range map[string]string{"go.mod": goMod, "main.go": main} {
			if err := os.WriteFile(filepath.Join(dir, name), []byte(text), 0o644); err != nil {
				t.Fatal(err)
			}
		}
		out := filepath.Join(dir, "bin")
		cmd := exec.Command(goBin, "build", "-o", out, ".")
		cmd.Dir = dir
		cmd.Env = append(os.Environ(), "GOWORK=off", "GOFLAGS=-mod=mod")
		if b, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("go build: %v\n%s", err, b)
		}
		info, err := os.Stat(out)
		if err != nil {
			t.Fatal(err)
		}
		return info.Size()
	}

	registryOnly := build("\t_, _ = vizcontract.Registry.ReadFile(\"registry/pick.json\")\n")
	withFixtures := build("\t_, _ = vizcontract.Registry.ReadFile(\"registry/pick.json\")\n" +
		"\t_, _ = vizcontract.Fixtures.ReadFile(\"fixtures/prometheus-line/args.json\")\n")

	diff := withFixtures - registryOnly
	t.Logf("registry only %d bytes, with fixtures %d bytes, fixtures %d bytes", registryOnly, withFixtures, fixtureBytes)
	// Padding in the binary can change the difference a little. If the linker kept the unused Fixtures, the
	// difference would be about 0.
	if diff < fixtureBytes*3/4 {
		t.Fatalf("the binary with Fixtures is only %d bytes larger, but the fixtures are %d bytes", diff, fixtureBytes)
	}
}
