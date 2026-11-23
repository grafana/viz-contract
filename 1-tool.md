# 1. The tool

The model calls the `render_grafana_app` tool of mcp-grafana with the `toolName` `query_datasource`. The Source
runs the query and gives the tool result to the App.

Shapes: `schemas/query-datasource-args.schema.json` gives the tool arguments. `schemas/tool-result.schema.json`
gives the tool result. [Chart options](#chart-options) gives the shapes of the chart options.

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
- `tool.49` The description of `type` in the schema of the tool arguments is `Optional chart to draw. With no
  type, the chart comes from the data. get_chart_options gives the data that a chart needs.` It does not list the
  data that each chart needs. The text of `get_chart_options` gives the data that one chart needs (`tool.44`), and
  the `type-mismatch` tool error gives it too (`tool.20`). Thus the tool list of a Host does not grow with the
  charts.

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

The Source reads `registry/chart-types.json` and `registry/pick.json`. No other part reads them at run time. The
Renderer build reads `chart-types.json` (`delivery.16`).

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

## Chart options

The model can change how a chart looks with `options` and `fieldConfig`. It does not guess an option. It reads the
options of a chart with the `get_chart_options` tool, and the Source checks each option that it gets.

Shapes: `schemas/chart-options-args.schema.json` gives the arguments of `get_chart_options`.
`schemas/field-config.schema.json` gives the form of `fieldConfig`. `schemas/chart-options.schema.json` gives
`chart-options.json`, the file of the Renderer that lists the options of each chart (`delivery.16`).

- `tool.36` `options` and `fieldConfig` have the form of the `options` and the `fieldConfig` of a Grafana panel
  JSON. They belong to the chart of `type`. Thus arguments that have one of them and no `type` do not validate
  (`tool.4`), and the Source never applies them to a chart that it picks.
- `tool.37` The Source reads the options of the chart from the `chart-options.json` of the Renderer in its binary.
  An option has a path: the names of the keys from the root object to the value, joined with dots, for example
  `legend.placement`. The root object of a panel option is `options`. The root object of a field option is
  `fieldConfig.defaults`. In an override, the `id` of a property is the path of a field option, which is the id of a
  registered field option (`delivery.22`). A key can have
  dots. Its name is then a part of the path as it is. Thus `{"legend.placement": "right"}` and
  `{"legend": {"placement": "right"}}` give the same path.
- `tool.38` The Source finds the options in `options` and in `fieldConfig.defaults` key by key, from the root
  object. If the path of a key is the path of an option, the value of the key is the value of that option, and the
  Source does not read the keys inside it. If the path is the start of the path of an option, the value must be an
  object, and the Source reads its keys. Otherwise the path is not an option. If two keys give the path of the
  same option, the path is set two times, and the Source does not check its values. If two keys give the same path
  that is not an option, or the same path whose value must be an object, the path has one problem. The `unit`
  argument sets the path `unit` of `fieldConfig.defaults` (`tool.22`). Thus, if the arguments have a `unit` and a
  key of `fieldConfig.defaults` also gives the path `unit`, that path is set two times.
- `tool.39` The Source checks `options` and `fieldConfig` before it queries. Each path must be an option of the
  chart, and each value must validate against the `schema` of its option. If one is not correct, the Source returns
  the `invalid-options` tool error of `states.json`, and does not query. `<problems>` has one problem for each path
  that is not correct, joined with `; `. A problem is `<path> is not an option`, `<path> must be <type>` or
  `<path> is set two times`.
  `<path>` starts with `options.`, `fieldConfig.defaults.` or `fieldConfig.overrides[<n>].`. `<n>` is the index of
  the override, from 0. `<type>` is the type text of the option (`tool.45`). For a value that must be an object
  (`tool.38`), `<type>` is `object`. The problems of `options` come first, then the problems of
  `fieldConfig.defaults`, each in the code point order of the paths. The problems of the overrides come next, in
  the order of the arguments. The other keys of `fieldConfig` come last, in code point order (`tool.40`). The
  problem `fieldConfig.defaults must be object` is in the place of the problems of `fieldConfig.defaults`, and the
  problem `fieldConfig.overrides must be array` is in the place of the problems of the overrides. For
  example: `invalid-options: timeseries does not accept these options:
  options.legend.position is not an option; options.lineWidth must be integer 0..20. get_chart_options lists the
  options of timeseries.`
- `tool.40` The schema of the tool arguments gives `fieldConfig` as an object only.
  `schemas/field-config.schema.json` gives its form, and the Source checks the form in the check of `tool.39`. A
  part that does not have the form is a problem of `invalid-options`:
  - `fieldConfig.<key> is not an option`, for a key that is not `defaults` or `overrides`.
  - `fieldConfig.defaults must be object` and `fieldConfig.overrides must be array`.
  - `fieldConfig.overrides[<n>] must be <override>`, for an override that does not validate against the
    `override` definition of the schema. `<override>` is the override form of `tool.44`. The Source does not
    check the properties of this override.

  In an override, two properties with the same `id` are the problem `fieldConfig.overrides[<n>].<id> is set two
  times`, as in `tool.38`. Each `id` of an override has one problem at most, and the problems of an override are
  in the order of its properties. The Source does not use the message of a schema library, so the text is the
  same in each Source. The matchers are `byName` and `byFrameRefID` of Grafana: `byName` takes the name of a field,
  and `byFrameRefID` takes the `refId` of a query. A matcher that takes a regular expression, for example
  `byRegexp`, is not allowed, because the Renderer would run the pattern in the browser with no time limit. The
  Source does not check that a matcher matches a field.
- `tool.41` The `panel.options` of the chart is the `options` of the chart row, and then each option of the
  arguments at its path. The Source writes a path as nested objects, also when the key of the arguments had dots.
  The `panel.fieldConfig` of the chart is the `fieldConfig` of the arguments, with each path of its `defaults`
  written in the same way. A `unit` of the arguments is then its `defaults.unit` (`tool.22`). The `fieldConfig` of the
  arguments cannot also give that path (`tool.38`). The panels of
  `alternatives` do not get the `options` and the `fieldConfig` of the arguments, because they belong to another
  chart.
- `tool.42` The Source writes only the options that the arguments have. It does not write the `default` of an
  option to the panel. The Renderer applies its own default.
- `tool.43` `get_chart_options` is a tool of mcp-grafana. The server lists it when `render_grafana_app` lists
  `query_datasource` (`tool.1`, `tool.2`). It reads `chart-options.json` only. It does not query Grafana. Its
  result is one text item, with no structured content, and the tool has no App. Thus a call does not draw a view.
  The schema of its arguments does not list the charts. If `type` is not a chart of `chart-types.json`, the tool
  returns the `unknown-chart` tool error of `states.json`. `<charts>` lists each chart, in the order of
  `chart-types.json`.
- `tool.44` The text of `get_chart_options` has these lines, in this order:
  1. `Options of <chart>. It needs <dataShape>. Set them in options.` `<dataShape>` is the `dataShape` of the
     chart in `chart-types.json`.
  2. One line for each entry of the `options` list of the chart, in the order of the file.
  3. `Field options of <chart>. Set them in fieldConfig.defaults for all fields, or in the properties of an
     override.`
  4. One line for each entry of the `fieldConfig` list of the chart, in the order of the file.
  5. `An override is <override>.` `<override>` is the override form:
     `{"matcher":{"id":"byName"|"byFrameRefID","options":"<name or refId>"},"properties":[{"id":"<path>","value":<value>}]}`
  6. `Advanced options not listed: <n>. Set advanced to true to list them.`

  The line of an entry is `<path>: <type>`, then ` = <default>` if the entry has a `default`, then
  ` // <description>`. `<default>` is JSON with no white space. For example: `legend.placement: "bottom" | "right"
  = "bottom" // Side of the chart that shows the legend`. If `advanced` is not true, steps 2 and 4 leave out the
  entries with the `tier` `advanced`, and `<n>` is the number of these entries. The text has line 6 only when `<n>`
  is more than 0.
- `tool.45` The type text of an option comes from its `schema`. The first of these that applies gives it:
  - With `anyOf`: the type text of each schema of the list, joined with ` | `, for example
    `boolean | number >=0`.
  - With `const`: the value as JSON.
  - With `enum`: each value as JSON, joined with ` | `.
  - With a list of types as the `type`: for each type of the list, the type text of the schema with only that
    type, joined with ` | `, for example `number | null`.
  - With the `type` `boolean`, `string` or `null`: the `type`.
  - With the `type` `integer` or `number`: the `type`. With a `minimum` and a `maximum`, ` <minimum>..<maximum>`
    follows. With only one, ` >=<minimum>` or ` <=<maximum>` follows.
  - With the `type` `array` and `items`: `array of `, and then the type text of `items`.
  - With the `type` `object` and `properties`: `{`, then each property as `<name>: ` and the type text of its
    schema, joined with `, `, then `}`. The properties are in the code point order of their names. A property that
    is not in `required` has `?` after its name. For example: `{fill: "solid" | "dash" | "dot"}`.
  - Otherwise: the `schema` as JSON with no white space.
- `tool.46` When the Source gives a tool result, it also gives a chart line to `render_grafana_app`: `Chart:
  <chart>. get_chart_options lists its options.` `<chart>` is `chart`. `render_grafana_app` adds the chart line
  after its text line, and the notes follow (`tool.28`). The chart line is not a note. `tool.30` does not change
  it, and `maxAppNotes` does not count it. Thus the model always knows the chart that the Source picked, and each
  of the `maxAppNotes` places is for a note of `tool.29`.
- `tool.47` No tool description and no schema of tool arguments holds the options of a chart, the form of an
  override or the list of the charts of `get_chart_options`. Thus the tool list of a Host does not grow with the
  options. The model reads the options of one chart, and the form of an override, only when it needs them.
- `tool.48` When the server starts, the Source checks the `chart-options.json` in its binary:
  - The file validates against its schema.
  - The file has one entry for each row of `chart-types.json`, and no other entry.
  - The hash of the file is `chartOptionsSha256` of the manifest of the Renderer in its binary (`delivery.21`).

  If a check fails, the server writes the cause to its log. `render_grafana_app` then does not list
  `query_datasource`, and the server does not list `get_chart_options`, as with no `dsquery` (`tool.1`). A CI
  check of the Source runs these checks with the files of its binary. Thus a file that is not correct fails the
  build of the Source, before a server starts with it.

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
  Thus `render_grafana_app` adds at most `maxAppNotes` lines of notes, and the `more not shown` line when it left
  some out.
