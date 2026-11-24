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

// The code point order of two texts (tool.39). The < of JavaScript gives the order of the UTF-16 code units, which
// is another order for a character above U+FFFF.
export function byCodePoint(a, b) {
  const x = [...a];
  const y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d) return d;
  }
  return x.length - y.length;
}

// The type text of an option (tool.45).
export function typeText(schema) {
  if (schema.anyOf) return schema.anyOf.map(typeText).join(' | ');
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (Array.isArray(schema.type)) return schema.type.map((type) => typeText({ ...schema, type })).join(' | ');
  if (schema.type === 'boolean' || schema.type === 'string' || schema.type === 'null') return schema.type;
  if (schema.type === 'integer' || schema.type === 'number') {
    const { minimum: min, maximum: max } = schema;
    if (min !== undefined && max !== undefined) return `${schema.type} ${min}..${max}`;
    if (min !== undefined) return `${schema.type} >=${min}`;
    if (max !== undefined) return `${schema.type} <=${max}`;
    return schema.type;
  }
  if (schema.type === 'array' && schema.items) return `array of ${typeText(schema.items)}`;
  if (schema.type === 'object' && schema.properties) {
    const names = Object.keys(schema.properties).sort(byCodePoint);
    return `{${names.map((n) => `${n}${schema.required?.includes(n) ? '' : '?'}: ${typeText(schema.properties[n])}`).join(', ')}}`;
  }
  return JSON.stringify(schema);
}

// The override form of line 5 of the text of get_chart_options (tool.44), and of the problem of tool.40.
const OVERRIDE_FORM =
  '{"matcher":{"id":"byName"|"byFrameRefID","options":"<name or refId>"},"properties":[{"id":"<path>","value":<value>}]}';

// The description of type in the schema of the tool arguments (tool.50).
export const TYPE_DESCRIPTION =
  'Optional chart to draw. With no type, the chart comes from the data. get_chart_options gives the data that a chart needs.';

// The tool error of get_chart_options for a type that is not a chart (tool.43).
export const unknownChartText = (type, charts) => `unknown-chart: ${type} is not a chart. The charts are: ${charts.join(', ')}.`;

// The text of get_chart_options for one entry of chart-options.json (tool.44). dataShape is the dataShape of
// the chart in chart-types.json.
export function optionsText(chart, dataShape, entry, advanced) {
  const shown = (list) => list.filter((o) => advanced || o.tier !== 'advanced');
  const line = (o) => `${o.path}: ${typeText(o.schema)}${o.default === undefined ? '' : ` = ${JSON.stringify(o.default)}`} // ${o.description}`;
  const hidden = advanced ? 0 : [...entry.options, ...entry.fieldConfig].filter((o) => o.tier === 'advanced').length;
  return [
    `Options of ${chart}. It needs ${dataShape}. Set them in options.`,
    ...shown(entry.options).map(line),
    `Field options of ${chart}. Set them in fieldConfig.defaults for all fields, or in the properties of an override.`,
    ...shown(entry.fieldConfig).map(line),
    `An override is ${OVERRIDE_FORM}.`,
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
// when the value validates. overrideSchema is the override definition of field-config.schema.json (tool.40).
export function optionProblems(args, entry, valid, overrideSchema) {
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const { defaults, overrides, ...others } = args.fieldConfig ?? {};
  // also has the paths that another argument sets: the unit argument sets the path unit of the defaults (tool.38).
  const check = (root, list, prefix, also = []) => {
    const { found, wrong } = findOptions(root, list);
    // A path that two keys give, for example legend.placement and legend: { placement }, is set two times (tool.38).
    const times = new Map();
    for (const [p] of found) times.set(p, (times.get(p) ?? 0) + 1);
    for (const p of also) if (times.has(p)) times.set(p, times.get(p) + 1);
    // One problem for each path (tool.39): two keys can give the same path that is not an option.
    const wrongOnce = wrong.filter(([p], i) => wrong.findIndex(([q]) => q === p) === i);
    return [
      ...wrongOnce.map(([p, type]) => [p, type ? `must be ${type}` : 'is not an option']),
      ...[...times].filter(([, n]) => n > 1).map(([p]) => [p, 'is set two times']),
      ...found.filter(([p, value, o]) => times.get(p) === 1 && !valid(o.schema, value)).map(([p, , o]) => [p, `must be ${typeText(o.schema)}`]),
    ]
      .sort((a, b) => byCodePoint(a[0], b[0]))
      .map(([p, text]) => `${prefix}${p} ${text}`);
  };
  const problems = check(args.options, entry.options, 'options.');
  if (defaults !== undefined && !isObject(defaults)) problems.push('fieldConfig.defaults must be object');
  else problems.push(...check(defaults, entry.fieldConfig, 'fieldConfig.defaults.', args.unit === undefined ? [] : ['unit']));
  if (overrides !== undefined && !Array.isArray(overrides)) problems.push('fieldConfig.overrides must be array');
  (Array.isArray(overrides) ? overrides : []).forEach((override, n) => {
    if (!valid(overrideSchema, override)) return problems.push(`fieldConfig.overrides[${n}] must be ${OVERRIDE_FORM}`);
    // One problem for each id, in the order of the first property that has the id (tool.40).
    const ids = override.properties.map((p) => p.id);
    override.properties.forEach(({ id, value }, i) => {
      if (ids.indexOf(id) !== i) return;
      const option = entry.fieldConfig.find((o) => o.path === id);
      if (!option) problems.push(`fieldConfig.overrides[${n}].${id} is not an option`);
      else if (ids.lastIndexOf(id) !== i) problems.push(`fieldConfig.overrides[${n}].${id} is set two times`);
      else if (!valid(option.schema, value)) problems.push(`fieldConfig.overrides[${n}].${id} must be ${typeText(option.schema)}`);
    });
  });
  for (const key of Object.keys(others).sort(byCodePoint)) problems.push(`fieldConfig.${key} is not an option`);
  return problems;
}

// The panel of the chart with the options and the fieldConfig of the tool arguments (tool.41). panel is the panel
// of tool.22 and tool.31.
export function panelWithOptions(panel, args, entry) {
  // Writes each option at its path, as nested objects, also when the key of the arguments had dots.
  const write = (target, root, list) => {
    for (const [p, value] of findOptions(root, list).found) {
      const keys = p.split('.');
      const last = keys.pop();
      keys.reduce((node, key) => (node[key] ??= {}), target)[last] = structuredClone(value);
    }
    return target;
  };
  const out = { ...panel, options: write(structuredClone(panel.options), args.options, entry.options) };
  if (args.fieldConfig) {
    out.fieldConfig = structuredClone(args.fieldConfig);
    if (args.fieldConfig.defaults) out.fieldConfig.defaults = write({}, args.fieldConfig.defaults, entry.fieldConfig);
    if (args.unit) out.fieldConfig.defaults = { ...out.fieldConfig.defaults, unit: args.unit };
  }
  return out;
}

// The core panel of a chart and its dropped options (save.2 to save.5). panel is the panel of the chart, row is
// the row of chart-types.json, core is the row of core-panels.json, file is chart-options.json, and coreVersion
// is the constant. With no core panel, there is no result (save.7).
export function corePanel(panel, row, core, file, coreVersion) {
  if (core.panel === 'none') return undefined;
  const entry = file.charts[row.name] ?? { options: [], fieldConfig: [] };
  const { type, pluginVersion, options, fieldConfig, ...rest } = panel;
  const out = { ...rest, type: core.panel, pluginVersion: coreVersion, options: structuredClone(core.options), fieldConfig: { defaults: {}, overrides: [] } };
  const dropped = [];
  // The paths of the options preset of the chart row. The core row takes their place (save.3).
  const leaves = (node, prefix = '') =>
    Object.entries(node).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
  const preset = leaves(row.options);
  const inPreset = (p) => preset.some((l) => l === p || l.startsWith(`${p}.`) || p.startsWith(`${l}.`));
  const write = (o, value) => {
    const keys = o.core.path.split('.');
    const last = keys.pop();
    // delivery.26 does not allow a path through a value that is not an object. Such a value is replaced here, so
    // that the check reports the file and does not stop.
    const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    keys.reduce((node, key) => (isObject(node[key]) ? node[key] : (node[key] = {})), o.core.root === 'options' ? out.options : out.fieldConfig.defaults)[last] = structuredClone(value);
  };
  // First the default of each entry with core whose option the panel does not have, then the options of the
  // panel (save.3). Thus the core panel draws an option that the panel does not have as the Renderer draws it.
  const set = [];
  const carry = (root, list, prefix, skip = () => false) => {
    const { found, wrong } = findOptions(root, list);
    const lost = wrong.map(([p]) => p).filter((p) => !skip(p));
    for (const o of list) if (o.core && o.default !== undefined && !found.some(([p]) => p === o.path)) write(o, o.default);
    for (const [p, value, o] of found) (o.core ? set.push([o, value]) : lost.push(p));
    dropped.push(...[...new Set(lost)].sort(byCodePoint).map((p) => `${prefix}${p}`));
  };
  carry(options, entry.options, 'options.', inPreset);
  carry(fieldConfig?.defaults, entry.fieldConfig, 'fieldConfig.defaults.');
  for (const [o, value] of set) write(o, value);
  (fieldConfig?.overrides ?? []).forEach((override, n) => {
    const properties = [];
    for (const { id, value } of override.properties) {
      const o = entry.fieldConfig.find((x) => x.path === id);
      if (o?.core) properties.push({ id: o.core.path, value: structuredClone(value) });
      else dropped.push(`fieldConfig.overrides[${n}].${id}`);
    }
    if (properties.length) out.fieldConfig.overrides.push({ ...structuredClone(override), properties });
  });
  return { panel: out, dropped };
}

// JSON with the keys of each object in order. Two values that are equal give the same text.
export const canonical = (value) =>
  JSON.stringify(value, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));

// The text of the message that the App sends for a MessageRequest (state.22 to state.25). null when the text is
// too long with no labels. patterns is the messages list of registry/messages.json.
// Step 1 of state.23: Cc, Cf (but not the joiners U+200C and U+200D), Zl, Zp, the variation selectors and the
// blank letters. Step 2: a joiner that is first, last or next to another joiner.
const NOT_SHOWN = /(?![‌‍])[\p{Cc}\p{Cf}\p{Zl}\p{Zp}︀-️\u{e0100}-\u{e01ef}ᅟᅠ⠀ㅤﾠ]/gu;
const LOOSE_JOINERS = /^[‌‍]+|[‌‍]+$|[‌‍]{2,}/gu;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function messageText(request, spec, constants, patterns) {
  const maxValue = constants.maxMessageValueChars.value;
  const clean = (value) => {
    const points = [...String(value).replace(NOT_SHOWN, '').replace(LOOSE_JOINERS, '')];
    return points.length > maxValue ? points.slice(0, maxValue - 1).join('') + '…' : points.join('');
  };
  const quoted = (value) => JSON.stringify(clean(value));
  const { series, point } = request;
  const labels = [];
  // First the duplicate keys go, then the cap (state.23).
  for (const [key, value] of Object.entries(series.labels)) {
    const k = quoted(key);
    if (!labels.some(([seen]) => seen === k)) labels.push([k, quoted(value)]);
  }
  labels.splice(constants.maxMessageLabels.value);
  const isTime = point.xType === 'time' && ISO_UTC.test(point.xIso ?? '');
  const code = `point-${point.xType === 'time' && !isTime ? 'string' : point.xType}`;
  const pattern = patterns.find((p) => p.code === code).message;
  const values = {
    y: quoted(point.y),
    series: quoted(series.name),
    refId: series.refId === undefined ? 'null' : quoted(series.refId),
    x: quoted(point.x),
    xIso: point.xIso,
    chart: quoted(spec.panel.title ?? spec.panel.type),
    from: new Date(spec.data.range.from).toISOString(),
    to: new Date(spec.data.range.to).toISOString(),
  };
  for (let n = labels.length; n >= 0; n--) {
    values.labels = `{${labels.slice(0, n).map(([k, v]) => `${k}:${v}`).join(',')}}`;
    const text = pattern.replace(/<(\w+)>/g, (_, name) => values[name]);
    if ([...text].length <= constants.maxMessageChars.value) return text;
  }
  return null;
}
