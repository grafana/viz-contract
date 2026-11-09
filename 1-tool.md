# 1. The tool

The model calls the `render_grafana_app` tool of mcp-grafana with the `toolName` `query_datasource`. The Source
runs the query and gives the tool result to the App.

Shapes: `schemas/query-datasource-args.schema.json` gives the tool arguments. `schemas/tool-result.schema.json`
gives the tool result.

## Availability

- `tool.1` The Source is in the opt-in category `dsquery` of mcp-grafana. If the server does not enable `dsquery`,
  `render_grafana_app` does not list `query_datasource`.
- `tool.2` The Source passes the queries of the model to the data source with no filter. Thus, if the server runs
  with `--disable-write`, `render_grafana_app` does not list `query_datasource`, except with `--enable-query`. With
  `--disable-query`, it never lists `query_datasource`.
- `tool.3` The Source is not a registered tool. The model can call it only through `render_grafana_app`.

## Arguments

- `tool.4` If the arguments do not validate against the schema, the Source returns a tool error with the
  validation message. It does not query.
- `tool.5` If the arguments have no `from` or no `to`, the Source uses `defaultFrom` or `defaultTo`.
- `tool.6` `from` and `to` accept each format that `/api/ds/query` accepts, for example `now-6h` or epoch
  milliseconds. Epoch milliseconds can be a string or an integer. The Source sends an integer as a string. The
  [data source API of Grafana](https://grafana.com/docs/grafana/latest/developers/http_api/data_source/#query-a-data-source)
  gives the formats.
- `tool.7` `type` is the chart that the model asks for. With no `type`, the Source picks the chart (`tool.18`).
- `tool.8` `unit` is a Grafana unit ID, for example `bytes`. It applies to all queries of the call. Thus two queries
  in different units show the same unit. The Source does not check the unit. The Renderer checks it
  (`state.9`).

## Query rules

- `tool.9` Each query has a `refId` that is unique in the call.
- `tool.10` All queries use the data source of `datasourceUid`. If a query has its own `datasource`, its `uid` must
  be `datasourceUid`. Otherwise the Source returns a tool error and does not query.
- `tool.11` A Prometheus query sets an explicit `legendFormat`, for example `{{handler}}`. With `__auto` or no
  `legendFormat`, `/api/ds/query` gives no display name, so the series names are not the same as in Grafana. The
  Source does not change `legendFormat`.
- `tool.12` If a query has no `maxDataPoints`, the Source sets it to `defaultMaxDataPoints`. If a query has no
  `intervalMs`, the Source sets it to the range divided by `maxDataPoints`, in whole milliseconds. If a query has no
  `datasource`, the Source sets it to the `uid` `datasourceUid`.

## The query

- `tool.13` The Source posts one request to `/api/ds/query` through `doDSQuery` of mcp-grafana. Thus the rules that
  `doDSQuery` applies, for example enforced label matchers, apply to the Source too.
- `tool.14` The Source resolves `from` and `to` to an absolute range in epoch milliseconds, and writes it to
  `data.range`. It writes the time when the response arrives to `data.capturedAt`.
- `tool.15` The Source copies the `results` object of the response to `data.results` with no change.
- `tool.16` The Source can give partial results: an entry with an `error` next to an entry with frames. It can
  also return one tool error for the whole call. The Source decides which one it gives.
- `tool.17` The tool result has no token, no cookie and no header of the request.

## The chart

The Source reads `registry/chart-types.json` and `registry/pick.json`. No other part reads them.

- `tool.18` With no `type`, the Source picks the chart. It makes the summary of the frames that
  `registry.schema.json` defines in the condition rule language. It takes the first rule of `pick.json` whose
  `when` matches. The last rule has an empty `when`, so one rule always matches.
- `tool.19` If the frames have no rows, the Source does not check `type`. The tool result has the chart of `type`,
  or the chart of the pick. The Renderer shows the `no-data` state.
- `tool.20` If the frames have rows and the model gave a `type`, the Source checks the `fits` list of that chart. If
  no condition of the list matches, the Source returns the `type-mismatch` tool error of `states.json`.
  `<dataShape>` is the `dataShape` of the chart. `<charts>` lists the charts that fit, in the order of
  `chart-types.json`. If no chart fits, `<charts>` is the chart of the pick.
- `tool.21` `chart` is the chart of `type`, or the chart of the pick.
- `tool.22` `panel.type` is the `panel` of the chart row, and `panel.options` is its `options`. If the arguments
  have a `unit`, `panel.fieldConfig.defaults.unit` is that unit.
- `tool.23` `alternatives` lists each other chart whose `fits` matches the frames, in the order of
  `chart-types.json`. Each entry has its own `panel`, made as in `tool.22`.

## Errors and the text result

- `tool.24` If the structured content of the tool result is larger than `maxResultBytes`, the Source returns the
  `too-large` tool error of `states.json`. It does not return the structured content.
- `tool.25` A tool error is an MCP tool result with `isError` set to true and one text item. For a tool error of
  `states.json`, the text is the code, a colon, a space and the message, for example `type-mismatch: sankey needs
  source, target and value fields. Charts that fit: timeseries, barchart.`
  `render_grafana_app` gives a tool error of the Source to the model in the same turn.
- `tool.27` If the Source knows a URL of its Grafana that a browser can open, it writes that URL to `grafanaUrl`.
- `tool.28` `render_grafana_app` replaces the text of the Source with its own text line, and adds the notes of
  the Source after that line, one note on each line. The Source gives its notes to `render_grafana_app` as an
  ordered list of text lines, next to its structured content. A Source that gives no list leaves the text line
  as it is. Thus, in the same turn, the model reads that line, the notes and the tool errors. The MCP Apps
  specification says that `structuredContent` is not added to the model context.
- `tool.29` The Source gives one note for each entry of `data.results` that has an `error`, also when every entry
  has one. The note is the `message` of `query-failed` in `notices.json`, filled with the `refId` and the `error`
  of the entry (`state.8`). The message is the same when one entry fails and when each entry fails.
- `tool.30` `render_grafana_app` makes the notes in this order: (1) replace each run of white space in a note with
  one space, (2) leave out each empty note, (3) keep the first `maxAppNotes` notes, (4) cut each kept note that is
  longer than `maxAppNoteChars` characters to that length, with `…` as its last character. A character is a
  Unicode code point. If the Source gave more notes after step 2, one more line follows the kept notes: `…`, a
  space, the number of the notes that step 3 left out and ` more not shown`, for example `… 2 more not shown`.
  Thus `render_grafana_app` adds at most `maxAppNotes` lines, and the `more not shown` line when it left some out.

## Query types

A data source plugin can describe the fields of its queries in a query types file. Grafana serves the file only
with the feature toggle `datasources.queryTypes`, and only for a plugin that ships one. The Source uses the file to
help the model correct a failed query. The query still goes to `/api/ds/query` (`tool.13`).

- `tool.31` The Source reads the query types only when an entry of `data.results` has an `error`. It sends
  `GET /apis/<plugin>.datasource.grafana.app/<version>/querytypes` to its Grafana. `<plugin>` is the `type` of the
  data source of `datasourceUid`. `<version>` is the preferred version of that API group. The response is a
  `QueryTypeDefinitionList`. Each item has a `metadata.name`, and a `spec` with `discriminators` and a JSON
  `schema`.
- `tool.32` If Grafana does not serve the query types, or the request fails, the Source gives no query type note.
  It does not return a tool error for this. It gives the notes of `tool.29` as before.
- `tool.33` The query type of a query is the first item for which each `field` and `value` of its `discriminators`
  matches the same field of the query. If no item matches, it is the item with no `discriminators`. If there is no
  such item, the query has no query type and gets no note.
- `tool.34` The Source gives one note for each query type of the queries of the failed entries, in the order of
  those entries. A query type that two failed entries use gets one note. The note is `Fields of <plugin> query type
  <name>: <fields>. Required: <required>.` `<fields>` lists the names of `spec.schema.properties`, and `<required>`
  lists `spec.schema.required`, each in the order of the file, with a comma and a space between names. If
  `<required>` is empty, the note has no `Required:` sentence. The Source gives these notes before the notes of
  `tool.29`. Thus `maxAppNotes` does not leave them out when many entries fail.
- `tool.35` The query types are not in the `render_grafana_app` description and not in the structured content.
  Thus they add no tokens to `tools/list`, and the model reads them only in a turn with a failed query.
