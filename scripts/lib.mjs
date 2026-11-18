// Shared helpers of the contract scripts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTRACT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (rel) => fs.readFileSync(path.join(CONTRACT, rel), 'utf8');
export const readJSON = (rel) => JSON.parse(read(rel));
export const json = (value) => JSON.stringify(value, null, 2) + '\n';

export const SCHEMAS = ['query-datasource-args', 'tool-result', 'viz-spec', 'registry'];

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

// The API group of the query types of a plugin (tool.32). null when the plugin has no group.
export function queryTypeGroup(plugin) {
  if (!plugin) return null;
  if (!plugin.includes('-')) return `${plugin}.datasource.grafana.app`;
  if (!plugin.endsWith('-datasource')) return null;
  const name = plugin.slice(0, -'-datasource'.length).replace(/^grafana-/, '');
  return `${name}.datasource.grafana.app`;
}

// A discriminator matches a query (tool.40).
const JSON_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const discriminatorMatches = (query, { field, value }) => {
  if (!Object.hasOwn(query, field)) return false;
  const v = query[field];
  if (typeof v === 'string') return v === value;
  if (typeof v === 'number') return JSON_NUMBER.test(value) && Number(value) === v;
  if (typeof v === 'boolean') return value === String(v);
  return false;
};

// The query type of a query (tool.34). undefined when the query has none.
export function queryTypeOf(query, items) {
  const discriminators = (item) => item.spec?.discriminators ?? [];
  return (
    items.find((item) => discriminators(item).length && discriminators(item).every((d) => discriminatorMatches(query, d))) ??
    items.find((item) => !discriminators(item).length)
  );
}

const byCodePoint = (a, b) => {
  const [x, y] = [[...a], [...b]];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] !== y[i]) return x[i].codePointAt(0) - y[i].codePointAt(0);
  }
  return x.length - y.length;
};

// The query type note of an item (tool.37).
export function queryTypeNote(plugin, item) {
  const sentence = (label, parts) => (parts.length ? ` ${label}: ${parts.join(', ')}.` : '');
  const schema = item.spec?.schema ?? {};
  return (
    `Plugin fields of ${plugin} query type ${item.metadata.name}.` +
    sentence('Set', (item.spec?.discriminators ?? []).map((d) => `${d.field}=${d.value}`)) +
    sentence('Required', schema.required ?? []) +
    sentence('All', Object.keys(schema.properties ?? {}).sort(byCodePoint))
  );
}

// The notes of the Source (tool.29, tool.33, tool.35 and tool.38). queryTypes is the querytypes.json of the set, or
// undefined. failedMessage is the message of query-failed in registry/notices.json.
export function sourceNotes(args, results, queryTypes, failedMessage) {
  const failed = args.queries.filter((q) => results[q.refId]?.error !== undefined);
  const errorNote = (q) => failedMessage.replace('<refId>', q.refId).replace('<error>', results[q.refId].error);
  const served = queryTypes?.status === 200 && Array.isArray(queryTypes.body?.items) && queryTypeGroup(queryTypes.plugin);
  const items = [];
  if (served) {
    for (const q of failed) {
      const item = queryTypeOf(q, queryTypes.body.items);
      if (item && !items.includes(item)) items.push(item);
    }
  }
  if (!items.length) return failed.map(errorNote);
  return [errorNote(failed[0]), ...items.map((item) => queryTypeNote(queryTypes.plugin, item)), ...failed.slice(1).map(errorNote)];
}

// The lines that render_grafana_app adds after its text line (tool.30).
export function appNoteLines(notes, constants) {
  const max = constants.maxAppNoteChars.value;
  const given = notes.map((n) => n.replace(/\s+/g, ' ')).filter((n) => n !== '');
  const kept = given.slice(0, constants.maxAppNotes.value).map((n) => {
    const points = [...n];
    return points.length > max ? points.slice(0, max - 1).join('') + '…' : n;
  });
  return given.length > kept.length ? [...kept, `… ${given.length - kept.length} more not shown`] : kept;
}

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
