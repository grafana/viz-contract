# 2. The viz spec

The App makes the viz spec from the tool result and the tool arguments, and gives it to the Renderer.

Shape: `schemas/viz-spec.schema.json`.

## What the App writes

- `spec.1` `specVersion` is the value of the constant `specVersion`.
- `spec.2` `panel.type`, `panel.options` and `panel.fieldConfig` are a copy of the `panel` of the tool result, or of
  the alternative that the user picked.
- `spec.3` `panel.datasource` has the `uid` `datasourceUid` of the tool arguments. `panel.targets` is a copy of the
  `queries` of the tool arguments.
- `spec.4` `data` is a copy of the `data` of the tool result, with no change.
- `spec.5` `theme` is the theme of the MCP Apps host context. When the Host changes the theme, the App calls
  `update` with a new viz spec that has the new `theme`.
- `spec.6` `timeZone` is the `timeZone` of the MCP Apps host context. If the host context has none, the App omits
  `timeZone`, and the Renderer uses the time zone of the browser. If `ui/notifications/host-context-changed` sends a
  new `timeZone`, the App calls `update` with a new viz spec that has the new `timeZone`.
- `spec.7` `grafanaUrl` is a copy of the `grafanaUrl` of the tool result. The Renderer does not open it. The App
  can show a link to it and open it with `ui/open-link`.
- `spec.8` `notices` holds the notices of the App, for example `chart-changed` (`refresh.10`). Each entry has a
  `code` and a `message` from `registry/notices.json`.
- `spec.15` `panel.title` is a copy of the `title` of the panel of the tool result, or of the alternative that the
  user picked. If that panel has no `title`, the viz spec has no `panel.title`.
- `spec.16` `timeRange` is a copy of the `from` and `to` of the tool arguments, with no change. A relative value,
  for example `now-6h`, stays relative. If the tool arguments have no `from` or no `to`, the App writes `defaultFrom`
  or `defaultTo`. The Renderer uses `timeRange` for Reset (`renderer.21`). `data.range` is the absolute form of the
  same range at the time of the query (`tool.14`).

## What the Renderer reads

- `spec.9` The Renderer ignores the fields that it does not know. Thus a new optional field does not break the
  Renderer.
- `spec.10` The Renderer draws the panel of `panel.type` with `panel.options` and `panel.fieldConfig`, as Grafana
  does with a panel JSON.
- `spec.11` The Renderer gives the frames of all entries of `data.results` to the panel, in the order of
  `panel.targets`. Each frame keeps its `refId`.
- `spec.12` A frame with `schema.meta.dataTopic` `annotations` is an annotation, not a series. The Renderer gives it
  to the panel in `data.annotations`, as Grafana does.
- `spec.13` The frames follow the [dataplane contract](https://grafana.com/developers/dataplane/).
- `spec.14` With no `theme`, the Renderer uses the dark theme.
