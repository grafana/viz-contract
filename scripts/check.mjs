// Runs all checks of the contract. Usage: node scripts/check.mjs
// Exit code 1 when a check fails. The word count is information only.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { CONTRACT, SCHEMAS, canonical, fits, matches, optionProblems, optionsText, panelWithOptions, read, readJSON, sourceRequest, summary, unknownChartText } from './lib.mjs';
import { generate, stale } from './generate.mjs';

let failures = 0;
const fail = (check, message) => {
  failures++;
  console.log(`FAIL [${check}] ${message}`);
};
const pass = (check, message) => console.log(`PASS [${check}] ${message}`);

const newAjv = () => {
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
  addFormats(ajv);
  return ajv;
};
const errorText = (v) => JSON.stringify(v.errors.slice(0, 3));

// 1. The schemas compile in strict mode, alone (bundled) and together (sources).
const ajv = newAjv();
for (const s of SCHEMAS) ajv.addSchema(readJSON(`schemas/${s}.schema.json`), `${s}.schema.json`);
for (const s of SCHEMAS) {
  try {
    ajv.getSchema(`${s}.schema.json`);
    newAjv().compile(readJSON(`schemas/bundled/${s}.schema.json`));
    pass('schemas', `${s} compiles`);
  } catch (e) {
    fail('schemas', `${s}: ${e.message}`);
  }
}

// 2. The generated parts and the constants table are current.
const old = stale(generate());
if (old.length) fail('generated', `not current: ${old.join(', ')}. Run node scripts/generate.mjs`);
else pass('generated', 'schemas, bundled schemas and the constants table are current');

// 3. The registries are valid, and they agree with each other.
const defs = { constants: 'constants', 'panel-types': 'panelTypes', 'chart-types': 'chartTypes', pick: 'pick', states: 'states', notices: 'notices' };
for (const [file, def] of Object.entries(defs)) {
  const v = ajv.getSchema(`registry.schema.json#/$defs/${def}`);
  if (v(readJSON(`registry/${file}.json`))) pass('registry', `${file}.json is valid`);
  else fail('registry', `${file}.json: ${errorText(v)}`);
}
const panels = readJSON('registry/panel-types.json').panels.map((p) => p.id);
const charts = readJSON('registry/chart-types.json').charts;
const names = charts.map((c) => c.name);
const rules = readJSON('registry/pick.json').rules;
const states = readJSON('registry/states.json');
const noticeCodes = readJSON('registry/notices.json').notices.map((n) => n.code);
const rel = [
  [new Set(names).size === names.length, 'chart names are unique'],
  [charts.every((c) => panels.includes(c.panel)), 'each chart names a panel of panel-types.json'],
  [panels.every((p) => charts.some((c) => c.panel === p)), 'each panel has a chart'],
  [rules.every((r) => names.includes(r.chart)), 'each pick rule names a chart'],
  [Object.keys(rules.at(-1).when).length === 0, 'the last pick rule has an empty when'],
];
for (const [ok, message] of rel) (ok ? pass : fail)('registry', message);

// 4. The fixtures validate, and they agree with the registries.
const FIX = path.join(CONTRACT, 'fixtures');
const sets = fs.readdirSync(FIX).filter((d) => fs.statSync(path.join(FIX, d)).isDirectory());
const fileSchema = {
  'args.json': 'query-datasource-args',
  'result.json': 'tool-result',
  'spec.json': 'viz-spec',
  'chart-options.json': 'chart-options',
  'options-args.json': 'chart-options-args',
};
// The chart options sets (fixtures.14) use the chart-options.json of the set options.
const chartOptions = readJSON('fixtures/options/chart-options.json').charts;
const valueAjv = newAjv();
const validValue = (schema, value) => valueAjv.compile(schema)(value);
let fixtureFailures = failures;
const SPEC_ERRORS = ['invalid-spec', 'unsupported-spec-version', 'unsupported-panel-type'];
const constants = readJSON('registry/constants.json');
for (const set of sets) {
  const files = Object.fromEntries(fs.readdirSync(path.join(FIX, set)).filter((f) => f.endsWith('.json')).map((f) => [f, readJSON(`fixtures/${set}/${f}`)]));
  for (const [f, data] of Object.entries(files)) {
    if (f === 'result.json' && data.isError) {
      const code = /^([a-z-]+): /.exec(data.content?.[0]?.text ?? '')?.[1];
      if (!states.toolErrors.some((e) => e.code === code)) fail('fixtures', `${set}/${f}: the tool error does not start with a code of states.json`);
      continue;
    }
    if (f === 'state.json') {
      for (const n of data.notices) if (!noticeCodes.includes(n.code)) fail('fixtures', `${set}/${f}: unknown notice ${n.code}`);
      if (data.state === 'error' && !states.errors.some((e) => e.code === data.error?.code)) fail('fixtures', `${set}/${f}: unknown error code`);
      continue;
    }
    if (!fileSchema[f]) continue;
    if (f === 'spec.json' && SPEC_ERRORS.includes(files['state.json']?.error?.code)) continue;
    const v = ajv.getSchema(`${fileSchema[f]}.schema.json`);
    if (!v(data)) fail('fixtures', `${set}/${f}: ${errorText(v)}`);
  }
  if (files['response.json'] && !(Number.isInteger(files['response.json'].status) && files['response.json'].body?.results)) {
    fail('fixtures', `${set}/response.json: it needs status and body.results`);
    continue;
  }
  if (files['request.json'] && JSON.stringify(files['request.json']) !== JSON.stringify(sourceRequest(files['args.json'], files['meta.json'].now, constants))) {
    fail('fixtures', `${set}/request.json is not the request of tool.5, tool.6 and tool.12`);
  }
  const result = files['result.json'];
  if (files['response.json'] && result && !result.isError) {
    const s = summary(files['response.json'].body.results);
    const type = files['args.json']?.type;
    const chart = type ?? rules.find((r) => matches(s, r.when)).chart;
    if (result.chart !== chart) fail('fixtures', `${set}: chart is ${result.chart}, the rules give ${chart}`);
    const alternatives = charts.filter((c) => c.name !== result.chart && fits(s, c)).map((c) => c.name);
    if (JSON.stringify(result.alternatives.map((a) => a.chart)) !== JSON.stringify(alternatives)) {
      fail('fixtures', `${set}: alternatives are not the charts that fit (${alternatives.join(', ')})`);
    }
  }
  const args = files['args.json'];
  if (args?.options || args?.fieldConfig) {
    const entry = chartOptions[args.type];
    const row = charts.find((c) => c.name === args.type);
    const problems = entry ? optionProblems(args, entry, validValue) : [];
    const form = ajv.getSchema('field-config.schema.json');
    if (args.fieldConfig && !form(args.fieldConfig)) fail('fixtures', `${set}/args.json: fieldConfig does not have the form of tool.40: ${errorText(form)}`);
    if (!entry) fail('fixtures', `${set}: chart-options.json of the set options has no chart ${args.type}`);
    else if (problems.length) {
      const text = `invalid-options: ${args.type} does not accept these options: ${problems.join('; ')}. get_chart_options lists the options of ${args.type}.`;
      if (result?.content?.[0]?.text !== text) fail('fixtures', `${set}/result.json is not the tool error of tool.39: ${text}`);
    } else if (!result || result.isError) fail('fixtures', `${set}: the options are correct, so result.json must be a tool result`);
    else {
      const plain = (c) => {
        const panel = { type: c.panel, options: c.options };
        if (args.title) panel.title = args.title;
        if (args.unit) panel.fieldConfig = { defaults: { unit: args.unit } };
        return panel;
      };
      if (canonical(result.panel) !== canonical(panelWithOptions(plain(row), args, entry))) fail('fixtures', `${set}: panel is not the panel of tool.41`);
      for (const a of result.alternatives) {
        if (canonical(a.panel) !== canonical(plain(charts.find((c) => c.name === a.chart)))) fail('fixtures', `${set}: the alternative ${a.chart} has options of the arguments (tool.41)`);
      }
    }
  }
  if (files['options-args.json']) {
    const { type, advanced } = files['options-args.json'];
    const known = names.includes(type);
    const text = !known ? unknownChartText(type, names) : chartOptions[type] ? optionsText(type, chartOptions[type], advanced === true) : undefined;
    const got = files['options-result.json'];
    if (got?.content?.length !== 1 || got.content[0].text !== text || got.structuredContent !== undefined || (got.isError === true) === known) {
      fail('fixtures', `${set}/options-result.json is not the result of tool.43 and tool.44:\n${text}`);
    }
  }
  if (set.startsWith('smoke-')) {
    const row = charts.find((c) => c.name === set.slice('smoke-'.length));
    const spec = files['spec.json'];
    if (!row) fail('fixtures', `${set}: no chart row`);
    else if (spec.panel.type !== row.panel || JSON.stringify(spec.panel.options) !== JSON.stringify(row.options)) {
      fail('fixtures', `${set}: panel type or options are not those of the chart row`);
    } else if (!fits(summary(spec.data.results), row)) fail('fixtures', `${set}: the data does not fit the chart`);
  }
}
for (const [chart, entry] of Object.entries(chartOptions)) {
  const preset = Object.keys(charts.find((c) => c.name === chart)?.options ?? {});
  for (const [name, list] of Object.entries(entry)) {
    const paths = list.map((o) => o.path);
    for (const o of list) {
      if (o.default !== undefined && !validValue(o.schema, o.default)) fail('fixtures', `chart-options.json: the default of ${chart} ${o.path} does not validate (delivery.18)`);
      if (paths.some((p) => p !== o.path && p.startsWith(`${o.path}.`))) fail('fixtures', `chart-options.json: ${chart} ${o.path} is the start of another path (delivery.15)`);
      if (paths.filter((p) => p === o.path).length > 1) fail('fixtures', `chart-options.json: ${chart} has ${o.path} two times`);
      if (name === 'options' && preset.some((p) => p === o.path || p.startsWith(`${o.path}.`) || o.path.startsWith(`${p}.`))) {
        fail('fixtures', `chart-options.json: ${chart} ${o.path} is in the options of the chart row (delivery.15)`);
      }
    }
  }
}
for (const s of ['options', 'options-invalid', 'options-list', 'options-list-advanced', 'options-list-unknown']) if (!sets.includes(s)) fail('fixtures', `no chart options set ${s}`);
for (const c of names) if (!sets.includes(`smoke-${c}`)) fail('fixtures', `no smoke set for ${c}`);
for (const code of [...SPEC_ERRORS, 'all-queries-failed']) if (!sets.includes(`error-${code}`)) fail('fixtures', `no error set for ${code}`);
const pickRuleOf = (set) => {
  const s = summary(readJSON(`fixtures/${set}/response.json`).body.results);
  return rules.find((r) => matches(s, r.when)).id;
};
const pickSets = sets.filter((s) => s.startsWith('pick-'));
for (const r of rules) if (!pickSets.some((s) => pickRuleOf(s) === r.id)) fail('fixtures', `no pick set for the rule ${r.id}`);
if (failures === fixtureFailures) pass('fixtures', `${sets.length} sets are valid`);

// 5. Prose files: no literal constant value, and no internal text.
const proseFiles = fs.readdirSync(CONTRACT).filter((f) => f.endsWith('.md')).concat('renderer-api.d.ts');
const START = '<!-- constants:start';
const END = '<!-- constants:end -->';
const prose = (f) => {
  const text = read(f);
  const s = text.indexOf(START);
  return s < 0 ? text : text.slice(0, s) + text.slice(text.indexOf(END) + END.length);
};
const literalPatterns = [];
for (const [name, c] of Object.entries(constants)) {
  if (c.value === null) continue;
  // A one-word value such as now is part of many ranges, for example now-6h to now. It is not a written value.
  if (typeof c.value === 'string' && /^[a-z]+$/.test(c.value)) continue;
  if (typeof c.value === 'string') literalPatterns.push([name, new RegExp('`' + c.value.replace(/[-]/g, '\\-') + '`')]);
  else if (name === 'specVersion') literalPatterns.push([name, new RegExp(`specVersion\\W{0,4}${c.value}\\b`)]);
  else {
    const forms = [`${c.value}\\s*${c.unit}`, `\\b${c.value}\\b(?=\\s*(${c.unit}|${c.unit.replace(/s$/, '')}))`];
    if (c.unit === 'bytes') forms.push(`\\b${c.value}\\b`, `\\b${c.value / 1048576}\\s*MiB\\b`, `\\b${c.value / 1024}\\s*KiB\\b`);
    if (c.unit === 'ms') forms.push(`\\b${c.value}\\b`, `\\b${c.value / 1000}\\s*(s|seconds?)\\b`);
    literalPatterns.push([name, new RegExp(forms.join('|'))]);
  }
}
let literalHits = 0;
for (const f of proseFiles) {
  for (const [name, re] of literalPatterns) {
    const m = prose(f).match(re);
    if (m) {
      literalHits++;
      fail('constants', `${f} writes the value of ${name} ("${m[0]}"). Name the constant`);
    }
  }
}
if (!literalHits) pass('constants', 'the prose names the constants and writes no value');

const PUBLIC = /hackathon|background\.md|brief\.md|docs\.google|slack|squad|sprint|spike|owner|mirror|fork|revision|eng-plan|mvp|release plan|phase [0-9]|demo site|#[0-9]+|gcx/i;
const textOf = (node, keys = ['description', 'meaning', 'dataShape', 'reason', 'when', 'message', 'title', '$comment']) => {
  const out = [];
  const walk = (n) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') for (const [k, v] of Object.entries(n)) (keys.includes(k) && typeof v === 'string' ? out.push(v) : walk(v));
  };
  walk(node);
  return out;
};
const publicHits = [];
for (const f of proseFiles) {
  read(f).split('\n').forEach((line, i) => {
    if (!PUBLIC.test(line)) return;
    if (f === 'future.md' && /^A gcx path can be a future addition after the MCP path\.$/.test(line) && !PUBLIC.test(line.replace('gcx', ''))) return;
    publicHits.push(`${f}:${i + 1}: ${line.trim()}`);
  });
}
const jsonFiles = [...SCHEMAS.map((s) => `schemas/${s}.schema.json`), ...Object.keys(defs).map((r) => `registry/${r}.json`)];
for (const f of jsonFiles) for (const t of textOf(readJSON(f))) if (PUBLIC.test(t)) publicHits.push(`${f}: ${t}`);
// A GitHub link must point to a public repository. This list names them, so the check names no private repository.
const PUBLIC_REPOS = /^github\.com\/(modelcontextprotocol\/[\w.-]+|grafana\/(grafana|mcp-grafana|dataplane|viz-contract))(\/|$)/i;
const linkHits = (text) => (text.match(/github\.com\/[\w.-]+(\/[\w.-]+)?/gi) || []).filter((l) => !PUBLIC_REPOS.test(l));
for (const f of proseFiles) read(f).split('\n').forEach((line, i) => linkHits(line).forEach((l) => publicHits.push(`${f}:${i + 1}: link to a repository that is not public: ${l}`)));
for (const f of jsonFiles) for (const t of textOf(readJSON(f))) linkHits(t).forEach((l) => publicHits.push(`${f}: link to a repository that is not public: ${l}`));
for (const h of publicHits) fail('public-text', h);
if (!publicHits.length) pass('public-text', 'no internal text');

// 6. package.json keeps the placeholder version. The release workflow sets the version from the tag.
const PLACEHOLDER = '0.0.0-development';
const pkgVersion = readJSON('package.json').version;
if (pkgVersion === PLACEHOLDER) pass('version', `package.json gives the placeholder ${PLACEHOLDER}`);
else fail('version', `package.json gives ${pkgVersion}. Keep ${PLACEHOLDER}: the release workflow sets the version`);

// 7. Word count of the prose (information only).
const words = proseFiles.filter((f) => f.endsWith('.md')).reduce((n, f) => n + (prose(f).match(/\S+/g) || []).length, 0);
console.log(`INFO [words] ${words} words of prose in *.md`);

console.log(failures ? `${failures} check(s) failed` : 'All checks passed');
process.exit(failures ? 1 : 0);
