// Runs all checks of the contract. Usage: node scripts/check.mjs
// Exit code 1 when a check fails. The word count is information only.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { CONTRACT, SCHEMAS, TYPE_DESCRIPTION, canonical, fits, matches, messageText, optionProblems, optionsText, panelWithOptions, read, readJSON, saveTimeRange, sourceRequest, summary, unknownChartText } from './lib.mjs';
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
const defs = { constants: 'constants', 'panel-types': 'panelTypes', 'chart-types': 'chartTypes', pick: 'pick', states: 'states', notices: 'notices', messages: 'messages' };
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
const messagePatterns = readJSON('registry/messages.json').messages;
const X_TYPES = ['time', 'number', 'string'];
const rel = [
  [X_TYPES.every((t) => messagePatterns.some((m) => m.code === `point-${t}`)), 'each xType of the Renderer API has a message pattern'],
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
  'retry-args.json': 'query-datasource-args',
};
// The chart options sets (fixtures.17) use the chart-options.json of the set options.
const { charts: chartOptions, panels: chartPanels } = readJSON('fixtures/options/chart-options.json');
const valueAjv = newAjv();
const validValue = (schema, value) => valueAjv.compile(schema)(value);
const overrideSchema = readJSON('schemas/field-config.schema.json').$defs.override;
let fixtureFailures = failures;
const SPEC_ERRORS = ['invalid-spec', 'unsupported-spec-version', 'unsupported-panel-type'];
const constants = readJSON('registry/constants.json');
// The shape of MessageRequest in renderer-api.d.ts.
const isText = (v) => typeof v === 'string';
const optional = (v, type) => v === undefined || typeof v === type;
const isMessageRequest = (r) =>
  r?.target === 'point' &&
  isText(r.series?.name) &&
  r.series.labels && typeof r.series.labels === 'object' && Object.values(r.series.labels).every(isText) &&
  optional(r.series.refId, 'string') &&
  isText(r.point?.x) && isText(r.point.y) && X_TYPES.includes(r.point.xType) &&
  optional(r.point.xIso, 'string') && optional(r.point.xRaw, 'number') && optional(r.point.yRaw, 'number');
// A case with renderer true is a point of spec.json (fixtures.16): a time series field with the name, the labels
// and the refId of the series, and a row at xRaw whose value is yRaw. x and y are the formatted text, which only
// the Renderer test can check.
const isSpecPoint = (spec, { series, point }) =>
  point.xType === 'time' && typeof point.xRaw === 'number' && point.xIso === new Date(point.xRaw).toISOString() &&
  Object.values(spec.data.results).flatMap((r) => r.frames || []).some((f) => {
    const fields = f.schema?.fields || [];
    const t = fields.findIndex((x) => x.type === 'time');
    const row = t < 0 ? -1 : f.data.values[t].indexOf(point.xRaw);
    return row >= 0 && f.schema.refId === series.refId && fields.some((x, i) =>
      x.type === 'number' && (x.config?.displayNameFromDS ?? x.name) === series.name &&
      JSON.stringify(x.labels ?? {}) === JSON.stringify(series.labels) && f.data.values[i][row] === point.yRaw);
  });
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
  if (files['args.json'] && files['spec.json']) {
    const want = { from: files['args.json'].from ?? constants.defaultFrom.value, to: files['args.json'].to ?? constants.defaultTo.value };
    if (JSON.stringify(files['spec.json'].timeRange) !== JSON.stringify(want)) {
      fail('fixtures', `${set}/spec.json: timeRange is not the from and to of args.json (spec.17)`);
    }
  }
  if (files['message.json']) {
    const cases = files['message.json'].cases;
    if (!Array.isArray(cases) || !cases.length || !files['spec.json']) fail('fixtures', `${set}/message.json: it needs cases and a spec.json`);
    else {
      cases.forEach((c, i) => {
        const where = `${set}/message.json: case ${i + 1}`;
        if (!isMessageRequest(c.request)) fail('fixtures', `${where}: request is not a MessageRequest`);
        else if (typeof c.renderer !== 'boolean') fail('fixtures', `${where}: renderer is not true or false`);
        else if (c.renderer && !isSpecPoint(files['spec.json'], c.request)) fail('fixtures', `${where}: renderer is true, but the request is not a point of spec.json`);
        else if (c.text !== messageText(c.request, files['spec.json'], constants, messagePatterns)) fail('fixtures', `${where}: text is not the text of state.22 to state.25`);
        else if (c.text !== null && [...c.text].length > constants.maxMessageChars.value) fail('fixtures', `${where}: text is longer than maxMessageChars`);
      });
    }
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
    const problems = entry ? optionProblems(args, entry, validValue, overrideSchema) : [];
    // optionProblems and the schema must agree on the form of fieldConfig (tool.40).
    const form = ajv.getSchema('field-config.schema.json');
    if (args.fieldConfig && !form(args.fieldConfig) && !problems.some((p) => /^fieldConfig\.(overrides\[\d+\] must be|defaults must be|overrides must be|[^.[]+ is not an option)/.test(p))) {
      fail('fixtures', `${set}/args.json: fieldConfig does not have the form of tool.40, and the problems do not say so: ${errorText(form)}`);
    }
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
  if (files['retry-args.json']) {
    // The second call of refresh.19 has the last tool arguments with no options and no fieldConfig (fixtures.19).
    const { options, fieldConfig, ...rest } = args ?? {};
    if (!/^invalid-options: /.test(result?.content?.[0]?.text ?? '')) fail('fixtures', `${set}/result.json is not the invalid-options tool error (refresh.19)`);
    if (!args || canonical(files['retry-args.json']) !== canonical(rest)) fail('fixtures', `${set}/retry-args.json is not args.json with no options and no fieldConfig (refresh.19)`);
    // The test answers the second call with the result of the set prometheus-line (fixtures.19).
    const base = { ...readJSON('fixtures/prometheus-line/args.json'), type: readJSON('fixtures/prometheus-line/result.json').chart };
    if (canonical(files['retry-args.json']) !== canonical(base)) fail('fixtures', `${set}/retry-args.json is not the args.json of prometheus-line with the type of its chart (fixtures.19)`);
    if (!noticeCodes.includes('options-dropped')) fail('fixtures', 'notices.json has no options-dropped notice (refresh.19)');
  }
  if (files['options-args.json']) {
    const { type, advanced } = files['options-args.json'];
    const known = names.includes(type);
    const text = !known ? unknownChartText(type, names) : chartOptions[type] ? optionsText(type, charts.find((c) => c.name === type).dataShape, chartOptions[type], advanced === true) : undefined;
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
      if (o.default !== undefined && !validValue(o.schema, o.default)) fail('fixtures', `chart-options.json: the default of ${chart} ${o.path} does not validate (delivery.20)`);
      if (paths.some((p) => p !== o.path && p.startsWith(`${o.path}.`))) fail('fixtures', `chart-options.json: ${chart} ${o.path} is the start of another path (delivery.17)`);
      if (paths.filter((p) => p === o.path).length > 1) fail('fixtures', `chart-options.json: ${chart} has ${o.path} two times`);
      if (name === 'options' && preset.some((p) => p === o.path || p.startsWith(`${o.path}.`) || o.path.startsWith(`${p}.`))) {
        fail('fixtures', `chart-options.json: ${chart} ${o.path} is in the options of the chart row (delivery.17)`);
      }
    }
  }
}
// panels has exactly the panels of the charts of the file (delivery.23).
const optionPanels = [...new Set(Object.keys(chartOptions).map((chart) => charts.find((c) => c.name === chart)?.panel))].sort();
const versionPanels = Object.keys(chartPanels ?? {}).sort();
if (JSON.stringify(versionPanels) !== JSON.stringify(optionPanels)) {
  fail('fixtures', `chart-options.json: panels must have exactly the panels of its charts (delivery.23): ${optionPanels.join(', ')}`);
}
for (const s of ['options', 'options-invalid', 'options-stale', 'options-list', 'options-list-advanced', 'options-list-unknown']) if (!sets.includes(s)) fail('fixtures', `no chart options set ${s}`);
// The set options-legend has one override with a color and one more property (fixtures.20).
const legendOverride = sets.includes('options-legend') ? readJSON('fixtures/options-legend/spec.json').panel.fieldConfig?.overrides?.[0] : undefined;
if (!(legendOverride?.matcher?.id === 'byName' && legendOverride.properties?.some((p) => p.id === 'color') && legendOverride.properties.length > 1)) {
  fail('fixtures', 'options-legend/spec.json needs one byName override with a color and one more property (fixtures.20)');
}
for (const c of names) if (!sets.includes(`smoke-${c}`)) fail('fixtures', `no smoke set for ${c}`);
for (const code of [...SPEC_ERRORS, 'all-queries-failed']) if (!sets.includes(`error-${code}`)) fail('fixtures', `no error set for ${code}`);
const pickRuleOf = (set) => {
  const s = summary(readJSON(`fixtures/${set}/response.json`).body.results);
  return rules.find((r) => matches(s, r.when)).id;
};
const pickSets = sets.filter((s) => s.startsWith('pick-'));
for (const r of rules) if (!pickSets.some((s) => pickRuleOf(s) === r.id)) fail('fixtures', `no pick set for the rule ${r.id}`);
// The cases of the set save-time-range (fixtures.30): the time range of a new dashboard and of the URL of a save.
if (!sets.includes('save-time-range')) fail('fixtures', 'no set save-time-range (fixtures.30)');
const rangeCases = sets.includes('save-time-range') ? readJSON('fixtures/save-time-range/time-range.json').cases : [];
const saveNow = sets.includes('save-time-range') ? readJSON('fixtures/save-time-range/meta.json').now : 0;
const isEpoch = (t) => /^\d+$/.test(String(t));
const isRelative = (t) => typeof t === 'string' && t.startsWith('now');
rangeCases.forEach((c, i) => {
  const name = `save-time-range case ${i + 1}`;
  const keys = Object.keys(c.args ?? { bad: 1 });
  if (keys.some((k) => k !== 'from' && k !== 'to')) return fail('fixtures', `${name}: args can have only from and to`);
  let want;
  try {
    want = saveTimeRange(c.args, saveNow, constants);
  } catch (e) {
    return fail('fixtures', `${name}: ${e.message}`);
  }
  if (canonical({ dashboard: c.dashboard, url: c.url }) !== canonical(want)) {
    fail('fixtures', `${name}: dashboard and url are not the result of save.20, save.23 and save.24:\n${JSON.stringify(want)}`);
  }
});
const rangeValues = rangeCases.flatMap((c) => [c.args?.from, c.args?.to]);
for (const [part, test] of [
  ['a relative value', () => rangeValues.some(isRelative)],
  ['no from and no to', () => rangeCases.some((c) => c.args && c.args.from === undefined && c.args.to === undefined)],
  ['epoch milliseconds as an integer', () => rangeValues.some((t) => Number.isInteger(t))],
  ['epoch milliseconds as a string', () => rangeValues.some((t) => typeof t === 'string' && isEpoch(t))],
  ['an absolute time next to a relative value', () => rangeCases.some((c) => isRelative(c.args?.from) !== isRelative(c.args?.to) && c.args?.from !== undefined && c.args?.to !== undefined)],
  ['a value that does not start with now and is not epoch milliseconds', () => rangeValues.some((t) => t !== undefined && !isRelative(t) && !isEpoch(t))],
  ['a relative value that the URL percent-encodes', () => rangeCases.some((c) => [c.url?.from, c.url?.to].some((t) => /%/.test(t ?? '')))],
]) {
  if (!test()) fail('fixtures', `no save-time-range case with ${part} (fixtures.30)`);
}
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

// A rule ID is defined at the start of a list item, for example "- `renderer.1` ...". Each ID is defined one time.
const ruleDefs = new Map();
for (const f of proseFiles.filter((p) => p.endsWith('.md'))) {
  read(f).split('\n').forEach((line, i) => {
    const id = /^\s*- `([a-z]+\.[0-9]+)` /.exec(line)?.[1];
    if (id) ruleDefs.set(id, [...(ruleDefs.get(id) ?? []), `${f}:${i + 1}`]);
  });
}
const dupIds = [...ruleDefs].filter(([, at]) => at.length > 1);
for (const [id, at] of dupIds) fail('rule-ids', `${id} is defined more than one time: ${at.join(', ')}`);
if (!dupIds.length) pass('rule-ids', `${ruleDefs.size} rule IDs, each defined one time`);

// tool.50 gives the description of type that generate.mjs writes to the schema of the tool arguments.
const typeRule = `\`tool.50\` The description of \`type\` in the schema of the tool arguments is \`${TYPE_DESCRIPTION}\``;
if (read('1-tool.md').replace(/\s+/g, ' ').includes(typeRule)) pass('type-description', 'tool.50 gives the description of type');
else fail('type-description', `1-tool.md does not give the description of type (tool.50): ${TYPE_DESCRIPTION}`);

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
