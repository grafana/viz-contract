// Writes the parts of the contract that come from the registries:
//   - the type enum and its description, the from and to defaults and the title maxLength (query-datasource-args.schema.json)//   - the panelId enum and the panel title maxLength (tool-result.schema.json)
//   - the specVersion const (viz-spec.schema.json)
//   - one bundled file for each schema in schemas/bundled/, with no reference to another file
//   - the constants table in README.md
// Usage: node generate.mjs          writes the files
//        node generate.mjs --check  writes nothing and lists each file that is not current
import fs from 'node:fs';
import path from 'node:path';
import { CONTRACT, SCHEMAS, json, read, readJSON } from './lib.mjs';

const GENERATED = 'Generated from registry/%s. Do not edit.';

export function generate() {
  const charts = readJSON('registry/chart-types.json').charts;
  const panels = readJSON('registry/panel-types.json').panels;
  const constants = readJSON('registry/constants.json');
  const out = new Map();

  const args = readJSON('schemas/query-datasource-args.schema.json');
  args.properties.from.default = constants.defaultFrom.value;
  args.properties.from.$comment = GENERATED.replace('%s', 'constants.json (defaultFrom)');
  args.properties.to.default = constants.defaultTo.value;
  args.properties.to.$comment = GENERATED.replace('%s', 'constants.json (defaultTo)');
  args.properties.title.maxLength = constants.maxTitleChars.value;
  args.properties.title.$comment = GENERATED.replace('%s', 'constants.json (maxTitleChars)');
  args.properties.type.$comment = GENERATED.replace('%s', 'chart-types.json');
  args.properties.type.enum = charts.map((c) => c.name);
  args.properties.type.description =
    'Optional chart to draw. With no type, the chart comes from the data. Each chart needs: ' +
    charts.map((c) => `${c.name} (${c.dataShape})`).join(', ') +
    '.';
  out.set('schemas/query-datasource-args.schema.json', args);

  const result = readJSON('schemas/tool-result.schema.json');
  result.$defs.panelId.$comment = GENERATED.replace('%s', 'panel-types.json');
  result.$defs.panelId.enum = panels.map((p) => p.id);
  result.$defs.panel.properties.title.maxLength = constants.maxTitleChars.value;
  result.$defs.panel.properties.title.$comment = GENERATED.replace('%s', 'constants.json (maxTitleChars)');
  out.set('schemas/tool-result.schema.json', result);

  const spec = readJSON('schemas/viz-spec.schema.json');
  spec.properties.specVersion.$comment = GENERATED.replace('%s', 'constants.json (specVersion)');
  spec.properties.specVersion.const = constants.specVersion.value;
  out.set('schemas/viz-spec.schema.json', spec);

  const sources = Object.fromEntries(
    SCHEMAS.map((s) => [`${s}.schema.json`, out.get(`schemas/${s}.schema.json`) ?? readJSON(`schemas/${s}.schema.json`)]),
  );
  for (const s of SCHEMAS) out.set(`schemas/bundled/${s}.schema.json`, bundle(`${s}.schema.json`, sources));

  const files = new Map([...out].map(([rel, value]) => [rel, json(value)]));
  files.set('README.md', withConstantsTable(read('README.md'), constants));
  return files;
}

// Copies each target of a reference to another file into $defs of the root schema, and points the reference
// to the copy. A copied part keeps its own references, resolved against its own file.
function bundle(rootName, sources) {
  const root = structuredClone(sources[rootName]);
  root.$defs ??= {};
  const copied = new Set();
  const keyOf = (file, pointer) => `${file.replace('.schema.json', '')}${pointer.replaceAll('/', '.')}`;
  const pointerGet = (doc, pointer) =>
    pointer.split('/').filter(Boolean).reduce((node, part) => node[part.replaceAll('~1', '/').replaceAll('~0', '~')], doc);

  function walk(node, file) {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, file));
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string') {
      const [refFile, pointer = ''] = node.$ref.split('#');
      const target = refFile || file;
      if (target !== rootName) {
        const key = keyOf(target, pointer);
        node.$ref = `#/$defs/${key}`;
        if (!copied.has(key)) {
          copied.add(key);
          const part = structuredClone(pointerGet(sources[target], pointer));
          root.$defs[key] = part;
          walk(part, target);
        }
      }
    }
    for (const [k, v] of Object.entries(node)) if (k !== '$ref') walk(v, file);
  }
  walk(root, rootName);
  if (Object.keys(root.$defs).length === 0) delete root.$defs;
  root.$comment = `Generated from schemas/${rootName}. Do not edit.`;
  return root;
}

const START = '<!-- constants:start. A script makes this table from registry/constants.json. Do not edit it. -->';
const END = '<!-- constants:end -->';

function withConstantsTable(readme, constants) {
  const rows = Object.entries(constants).map(
    ([name, c]) =>
      `| \`${name}\` | ${c.value === null ? 'not set' : c.value} | ${c.unit} | ${c.changeable ? 'yes' : 'no'} | ${c.meaning} |`,
  );
  const table = ['| Name | Value | Unit | Changeable | Meaning |', '| ---- | ----- | ---- | ---------- | ------- |', ...rows].join('\n');
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start < 0 || end < start) throw new Error('README.md has no constants table markers');
  return readme.slice(0, start) + `${START}\n${table}\n` + readme.slice(end);
}

export function stale(files = generate()) {
  return [...files].filter(([rel, text]) => {
    const p = path.join(CONTRACT, rel);
    return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text;
  }).map(([rel]) => rel);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = generate();
  if (process.argv.includes('--check')) {
    const old = stale(files);
    for (const rel of old) console.log(`not current: ${rel}`);
    process.exit(old.length ? 1 : 0);
  }
  for (const [rel, text] of files) {
    fs.mkdirSync(path.dirname(path.join(CONTRACT, rel)), { recursive: true });
    fs.writeFileSync(path.join(CONTRACT, rel), text);
  }
  console.log(`wrote ${files.size} files`);
}
