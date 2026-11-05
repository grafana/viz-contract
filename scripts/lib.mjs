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
