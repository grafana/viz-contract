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

## The Explore link

- `spec.16` If the viz spec has `grafanaUrl`, the App can show a link that opens the queries of the chart in Grafana
  Explore. The App opens it with `ui/open-link`, as the link of `spec.7`.
- `spec.17` The Explore URL is `grafanaUrl` with the path `/explore` after it, and two query parameters:
  `schemaVersion` and `panes`. `schemaVersion` is the value of the constant `exploreSchemaVersion`. If `grafanaUrl`
  has a path, for a Grafana under a sub path, `/explore` comes after that path.
- `spec.18` `panes` is a JSON object with one entry, the pane. Its key can be any string. The pane has these fields:
  - `datasource` is the `uid` of `panel.datasource`.
  - `queries` is a copy of `panel.targets`. A query with no `datasource` gets `panel.datasource`. A query with a
    `datasource` keeps it.
  - `range` has the `from` and the `to` of `data.range`, each as a string of epoch milliseconds. Thus Explore shows
    the time range of the chart. A relative range would show the data of a later time.
- `spec.19` Grafana reads `panes` from the version `exploreMinGrafanaVersion`. An older Grafana opens an empty
  Explore. The tool result does not give the Grafana version, so the App always makes the URL of `spec.17`.

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
