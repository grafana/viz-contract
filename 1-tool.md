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
- `tool.31` If the arguments have a `title`, the `panel.title` of the chart and of each alternative is that title,
  with no change. With no `title`, no panel has a `title`. A `title` of only white space does not validate
  (`tool.4`).

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

A data source plugin can describe the fields of its queries as query types. Grafana serves the query types of a
plugin only with the feature toggles `datasources.queryTypes` and `datasource.useNewCRUDAPIs`, and only for a
plugin that has query types. The Source uses them to help the model correct a failed query. The query still goes
to `/api/ds/query` (`tool.13`). The model reads the query types only in a turn with a failed query. Thus they add no
tokens to `tools/list` (`tool.36`).

- `tool.32` The Source reads the query types only when an entry of `data.results` has an `error`. Then it sends
  these requests to its Grafana, in this order:
  1. `GET /api/datasources/uid/<datasourceUid>`. `<plugin>` is the `type` of the response. A Source that has the
     `type` from another request of the same call does not send this request.
  2. `GET /apis/<group>`. `<version>` is the `preferredVersion.version` of the response.
  3. `GET /apis/<group>/<version>/querytypes`. The response is a `QueryTypeDefinitionList`. Each item has a
     `metadata.name`, and a `spec` with a JSON `schema`. The `spec` can also have `discriminators`.

  `<group>` is `<name>.datasource.grafana.app`. If `<plugin>` has no `-`, `<name>` is `<plugin>`, for example
  `prometheus`. If `<plugin>` ends with `-datasource`, `<name>` is `<plugin>` with no `-datasource` at its end and
  no `grafana-` at its start, for example `testdata` for `grafana-testdata-datasource`. Each other `<plugin>` has
  no group, and the Source sends no request 2 and no request 3 for it.
- `tool.39` The Source sends each request of `tool.32` one time for each call at most, also when two or more
  queries failed. Thus a call with a failed query has three more requests at most, and a call with no failed query
  has none. The three requests together take `queryTypesTimeoutMs` at most. The time starts when the Source sends
  the first of them. When the time ends, the Source stops the requests. The Source does not keep a response of
  these requests for a later call. Thus a change of a feature toggle or of a plugin applies to the next call.
- `tool.33` The Source gives no query type note if Grafana does not serve the query types, if a request of
  `tool.32` fails, if `<plugin>` has no group, or if the time of `tool.39` ends. It does not return a tool error
  for this. It gives the notes of `tool.29` as before.
- `tool.34` The Source finds the query type of a query in two steps. First it reads only the items that have one
  or more `discriminators`, in the order of the response. The query type is the first of these items for which
  each of its `discriminators` matches the query (`tool.40`). If none of these items matches, the query type is
  the first item with no `discriminators`. If there is no such item, the query has no query type and gets no
  note. Thus an item with no `discriminators` is only a fallback, also when it is first in the response.
- `tool.40` A discriminator has a `field` and a `value`. The `value` is always a string. The discriminator matches
  a query if the query, as the model gave it, has a field with the name `field` at its top level, and the value
  of that field matches the `value`:
  - A string matches if it has the same Unicode code points as the `value`.
  - A number matches if the `value` is the JSON text of a number that is equal to it. For example, the number `1`
    matches the `value` `"1"`.
  - A boolean matches if the `value` is `true` or `false` and names the same boolean.
  - `null`, an object and an array do not match.

  The Source reads `field` as one name and not as a path. Thus the `field` `a.b` is the top-level field with the
  name `a.b`, and the Source reads no nested field. A query that does not have the field does not match. Thus a
  query that leaves out `queryType` gets the item with no `discriminators`, or no note (`tool.34`). The Source
  does not guess a query type for it.
- `tool.35` A failed query is a query of the call whose `refId` is the key of an entry of `data.results` that has
  an `error`. The order of the failed queries is the order in which the model gave the queries of the call.
  `data.results` is a JSON object, and thus it gives no order. The Source gives one note for each query type of
  the failed queries, in the order of the first failed query that has each query type. A query type that two
  failed queries have gets one note.
- `tool.36` The Source writes the query types only to its notes. It does not write them to the description of
  `render_grafana_app`, to the schema of the tool arguments or to the structured content. Thus the structured
  content of a call is the same with query types and with none.
- `tool.37` The query type note is `Plugin fields of <plugin> query type <name>. Set: <discriminators>. Required:
  <required>. All: <fields>.` `<discriminators>` lists each of the `discriminators` of the item as `<field>=<value>`,
  in the order of the response. `<required>` lists `spec.schema.required` in the order of the response. `<fields>`
  lists the names of `spec.schema.properties` in ascending order of their Unicode code points. A comma and a space
  are between the parts of each list. If a list is empty, the note does not have the sentence of that list. The
  schema can leave out a field of the `discriminators`, for example `queryType`. Thus the note has `Set:`, and the
  model does not lose the field that selects the query type. The sentences are in the order `Set:`, `Required:`,
  `All:`. Thus the cut of `tool.30` leaves out the end of `<fields>` first. `All:` is best effort: the start of the
  note, `Set:` and `Required:` can use most of `maxAppNoteChars`, and then the cut leaves out most of `<fields>`
  or all of it. The Source does not make the note shorter. The schema has only the fields of the
  plugin. It does not have the fields that each query can have, for example `refId`, `datasource`, `intervalMs`
  and `maxDataPoints`. Thus the note says `Plugin fields`, and the model keeps those fields in its query.
- `tool.38` When the Source has a query type note, it gives its notes in this order: (1) the note of `tool.29` for
  the first failed query, (2) the query type notes in the order of `tool.35`, (3) the notes of `tool.29` for the
  other failed queries, in the order of `tool.35`. Thus the model always reads one `error`. Step 3 of `tool.30`
  leaves out notes from the end of this order: first the notes of the other failed queries, then the last query
  type notes. When the failed queries have `maxAppNotes` or more query types, the model does not read a note for
  each query type. When they have one less than `maxAppNotes` or more, the model reads no `error` of the other
  failed queries. This order is intended: one `error` with the fields that correct it helps the model more than a
  second `error`. The `more not shown` line of `tool.30` tells the model that notes are left out. A query that
  still fails gives its `error` in the next call.

