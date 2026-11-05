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
  the Source after that line, one note on each line. Thus, in the same turn, the model reads that line, the notes
  and the tool errors. The MCP Apps specification says that `structuredContent` is not added to the model context.
- `tool.29` The Source gives one note for each failed query of a partial result: `Query`, a space, the `refId`, a
  space, `failed:`, a space and the `error` of the entry, for example `Query B failed: bad_data: parse error:
  unclosed left parenthesis`.
- `tool.30` `render_grafana_app` replaces each run of white space in a note with one space, and leaves out an
  empty note. It adds `maxAppNotes` notes or fewer. A note that is longer than `maxAppNoteChars` characters is
  cut to that length, and its last character is `…`. If the Source gives more notes, the last line is `…`, a
  space, the number of the other notes and ` more not shown`, for example `… 2 more not shown`.
