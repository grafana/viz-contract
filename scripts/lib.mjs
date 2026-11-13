// Shared helpers of the contract scripts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTRACT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (rel) => fs.readFileSync(path.join(CONTRACT, rel), 'utf8');
export const readJSON = (rel) => JSON.parse(read(rel));
export const json = (value) => JSON.stringify(value, null, 2) + '\n';

export const SCHEMAS = ['query-datasource-args', 'field-config', 'chart-options-args', 'chart-options', 'tool-result', 'viz-spec', 'registry'];

// The summary of the frames and the matcher of the condition rule language (schemas/registry.schema.json).
const FIELD_TYPES = ['time', 'number', 'string', 'boolean', 'trace', 'geo', 'enum', 'other', 'frame', 'nestedFrames'];

export function summary(results) {
  const frames = Object.values(results)
    .flatMap((r) => r.frames || [])
    .filter((f) => f.schema?.meta?.dataTopic !== 'annotations');
  const s = { frameCount: frames.length, rowCountTotal: 0, rowCountMax: 0, fieldCount: 0, fieldCountMax: 0 };
  const counts = {};
  let hasTime = false;
  let first;
  let instant = true;
  for (const f of frames) {
    const rows = f.data?.values?.[0]?.length || 0;
    s.rowCountTotal += rows;
    s.rowCountMax = Math.max(s.rowCountMax, rows);
    const fields = f.schema?.fields || [];
    s.fieldCount += fields.length;
    s.fieldCountMax = Math.max(s.fieldCountMax, fields.length);
    if (f.schema?.meta?.type) s[`hasDataFrameType.${f.schema.meta.type}`] = true;
    if (f.schema?.meta?.preferredVisualisationType) {
      s[`hasPreferredVisualisationType.${f.schema.meta.preferredVisualisationType}`] = true;
    }
    fields.forEach((field, i) => {
      const type = f.data?.enums?.[i] ? 'string' : field.type || 'other';
      counts[type] = (counts[type] || 0) + 1;
      s[`hasFieldName.${String(field.name).toLowerCase()}`] = true;
      if (type !== 'time') return;
      hasTime = true;
      for (const v of f.data?.values?.[i] || []) {
        if (typeof v !== 'number') continue;
        if (first === undefined) first = v;
        else if (v !== first) instant = false;
      }
    });
  }
  s.isInstant = hasTime && first !== undefined && instant;
  for (const t of FIELD_TYPES) {
    s[`fieldCountByType.${t}`] = counts[t] || 0;
    s[`hasFieldType.${t}`] = (counts[t] || 0) > 0;
  }
  return s;
}

export function matches(s, condition) {
  return Object.entries(condition).every(([key, want]) => {
    const value = s[key] ?? false;
    if (Array.isArray(want)) return want.includes(value);
    if (want && typeof want === 'object') {
      return typeof value === 'number' && (want.min === undefined || value >= want.min) && (want.max === undefined || value <= want.max);
    }
    return value === want;
  });
}

export const fits = (s, chart) => chart.fits.some((condition) => matches(s, condition));

// The time of a from or to value, in epoch milliseconds. It knows the forms that the fixtures use.
export function resolveTime(t, now) {
  if (typeof t === 'number') return t;
  if (/^\d+$/.test(t)) return Number(t);
  if (t === 'now') return now;
  const m = /^now-(\d+)([smhdw])$/.exec(t);
  if (!m) throw new Error(`time ${t} is not a form that the fixtures use`);
  return now - Number(m[1]) * { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[m[2]];
}

// The /api/ds/query request body of the Source (tool.5, tool.6 and tool.12).
export function sourceRequest(args, now, constants) {
  const from = args.from ?? constants.defaultFrom.value;
  const to = args.to ?? constants.defaultTo.value;
  const range = resolveTime(to, now) - resolveTime(from, now);
  return {
    from: String(from),
    to: String(to),
    queries: args.queries.map((q) => {
      const maxDataPoints = q.maxDataPoints ?? constants.defaultMaxDataPoints.value;
      return { ...q, datasource: q.datasource ?? { uid: args.datasourceUid }, maxDataPoints, intervalMs: q.intervalMs ?? Math.floor(range / maxDataPoints) };
    }),
  };
}

// The type text of an option (tool.45).
export function typeText(schema) {
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (schema.type === 'boolean' || schema.type === 'string') return schema.type;
  if (schema.type === 'integer' || schema.type === 'number') {
    const { minimum: min, maximum: max } = schema;
    if (min !== undefined && max !== undefined) return `${schema.type} ${min}..${max}`;
    if (min !== undefined) return `${schema.type} >=${min}`;
    if (max !== undefined) return `${schema.type} <=${max}`;
    return schema.type;
  }
  if (schema.type === 'array' && schema.items) return `array of ${typeText(schema.items)}`;
  return JSON.stringify(schema);
}

// Line 5 of the text of get_chart_options (tool.44).
const OVERRIDE_FORM =
  'An override is {"matcher":{"id":"byName","options":"<field name>"},"properties":[{"id":"<path>","value":<value>}]}. The matcher id can also be byRegexp or byFrameRefID.';

// The tool error of get_chart_options for a type that is not a chart (tool.43).
export const unknownChartText = (type, charts) => `unknown-chart: ${type} is not a chart. The charts are: ${charts.join(', ')}.`;

// The text of get_chart_options for one entry of chart-options.json (tool.44).
export function optionsText(chart, entry, advanced) {
  const shown = (list) => list.filter((o) => advanced || o.tier !== 'advanced');
  const line = (o) => `${o.path}: ${typeText(o.schema)}${o.default === undefined ? '' : ` = ${JSON.stringify(o.default)}`} // ${o.description}`;
  const hidden = advanced ? 0 : [...entry.options, ...entry.fieldConfig].filter((o) => o.tier === 'advanced').length;
  return [
    `Options of ${chart}. Set them in options.`,
    ...shown(entry.options).map(line),
    `Field options of ${chart}. Set them in fieldConfig.defaults for all fields, or in the properties of an override.`,
    ...shown(entry.fieldConfig).map(line),
    OVERRIDE_FORM,
    ...(hidden ? [`Advanced options not listed: ${hidden}. Set advanced to true to list them.`] : []),
  ].join('\n');
}

// The options of a root object (tool.38): found has [path, value, option], and wrong has [path, type]. The type
// is object for a value that must be an object, and it is not set for a path that is not an option.
function findOptions(root, list, prefix = '', out = { found: [], wrong: [] }) {
  for (const [key, value] of Object.entries(root ?? {})) {
    const p = prefix ? `${prefix}.${key}` : key;
    const option = list.find((o) => o.path === p);
    if (option) out.found.push([p, value, option]);
    else if (!list.some((o) => o.path.startsWith(`${p}.`))) out.wrong.push([p]);
    else if (value && typeof value === 'object' && !Array.isArray(value)) findOptions(value, list, p, out);
    else out.wrong.push([p, 'object']);
  }
  return out;
}

// The problems of the options and the fieldConfig of the tool arguments (tool.39). valid(schema, value) is true
// when the value validates. The paths of the fixtures are ASCII, so the order of < is the code point order.
export function optionProblems(args, entry, valid) {
  const check = (root, list, prefix) => {
    const { found, wrong } = findOptions(root, list);
    return [
      ...wrong.map(([p, type]) => [p, type ? `must be ${type}` : 'is not an option']),
      ...found.filter(([, value, o]) => !valid(o.schema, value)).map(([p, , o]) => [p, `must be ${typeText(o.schema)}`]),
    ]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([p, text]) => `${prefix}${p} ${text}`);
  };
  const problems = [
    ...check(args.options, entry.options, 'options.'),
    ...check(args.fieldConfig?.defaults, entry.fieldConfig, 'fieldConfig.defaults.'),
  ];
  (args.fieldConfig?.overrides ?? []).forEach((override, n) => {
    for (const { id, value } of override.properties) {
      const option = entry.fieldConfig.find((o) => o.path === id);
      if (!option) problems.push(`fieldConfig.overrides[${n}].${id} is not an option`);
      else if (!valid(option.schema, value)) problems.push(`fieldConfig.overrides[${n}].${id} must be ${typeText(option.schema)}`);
    }
  });
  return problems;
}

// The panel of the chart with the options and the fieldConfig of the tool arguments (tool.41). panel is the panel
// of tool.22 and tool.31.
export function panelWithOptions(panel, args, entry) {
  const options = structuredClone(panel.options);
  for (const [p, value] of findOptions(args.options, entry.options).found) {
    const keys = p.split('.');
    const last = keys.pop();
    keys.reduce((node, key) => (node[key] ??= {}), options)[last] = value;
  }
  const out = { ...panel, options };
  if (args.fieldConfig) {
    out.fieldConfig = structuredClone(args.fieldConfig);
    if (args.unit) out.fieldConfig.defaults = { ...out.fieldConfig.defaults, unit: args.unit };
  }
  return out;
}

// JSON with the keys of each object in order. Two values that are equal give the same text.
export const canonical = (value) =>
  JSON.stringify(value, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));
