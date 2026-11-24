# 9. Save

A save writes the chart to a Grafana dashboard as a new panel. The Source does the save. The App and the model
only ask for it, with the `save_chart` tool of mcp-grafana. This file gives three parts of a save: the core
panel of a chart, the time range of a saved panel, and the `save_chart` tool. These parts are not specified yet
(`future.md`): the JSON of the saved panel, its place in the dashboard, and how the Source knows that a save
needs the core panel.

The panel of a chart is a Grafana panel plugin (`tool.22`). A Grafana can draw it only when that plugin is
installed. A core Grafana panel needs no plugin. The core panel of a chart is the core Grafana panel that is
nearest to the chart. A save needs the core panel when the Grafana of the save cannot draw the panel of the
chart. A Grafana of `coreVersion` or of a newer version can read the core panel (`save.9`).

## The core panel

The map from a chart to its core panel has two parts. `registry/core-panels.json` gives the core panel of each
chart. The `chart-options.json` of the Renderer gives the place of each chart option in that core panel
(`delivery.25`). Thus the names of the options stay data of the Renderer (`version.13`). The standard field
options of Grafana are not options of one chart, so `registry/core-panels.json` gives their place (`save.10`).
The Source makes the core panel, because it reads both files (`tool.37`). Both parts are written for Grafana of
`coreVersion`. `coreVersion` is a version of Semantic Versioning 2.0.0 (`version.14`).

The rules are in the order of their IDs. The one exception is `save.10`: it is after `save.4`, because it adds
to `save.3` and `save.4`, and `save.5` uses it.

- `save.1` `registry/core-panels.json` has one row for each row of `registry/chart-types.json`, in the same
  order. The `panel` of a row is the type of the core panel of the chart, or `none`. A row with a core panel also
  has `options`: the options preset that the core panel gets. The preset has each option that the core panel
  needs to draw the data of the chart as the chart draws it. For example, the core `piechart` panel draws one
  part for each row only with `reduceOptions.values`. The core `heatmap` panel reads a panel with no options as
  a panel of an old version, and then it calculates the buckets from the values. Thus its preset has `calculate`.
- `save.2` The core panel is made from the panel of the chart (`tool.22`, `tool.41`) and the row of the chart:
  - `type` is the `panel` of the row.
  - `pluginVersion` is `coreVersion`. Grafana then runs the migrations of the core panel from that version.
  - `options` starts as the `options` of the row.
  - `fieldConfig` has `defaults` and `overrides`. They start empty.
  - Each other key of the panel of the chart is in the core panel with no change, for example `title`.
- `save.3` The options of the panel of the chart are found key by key, as in `tool.38`: in `options` with the
  `options` list of the chart, and in `fieldConfig.defaults` with the `fieldConfig` list. A carried option is an
  option whose entry has `core`, or a standard field option that `save.10` carries. The core panel gets values in
  two steps:
  1. Each entry of the two lists that has `core` and a `default` gives its `default`, if the panel of the chart
     does not have the option. The Renderer applies that default to the chart (`tool.42`), and the core panel has
     its own defaults. Thus the core panel draws the option as the chart does.
  2. Each carried option of the panel of the chart gives its value.

  A value is written at the `path` of `core`, as nested objects. With the `root` `options`, the path starts at
  `options`, and the value can replace a value of the preset. With the `root` `fieldConfig`, the path starts at
  `fieldConfig.defaults`. A path of the `options` of the chart row is not an option of the chart (`delivery.17`),
  and it is not a dropped option. The core panel does not get it, because the `type` and the preset of the core
  panel take its place.
- `save.4` Each override of the panel of the chart keeps its `matcher` with no change. A property whose `id` is
  the path of an entry of the `fieldConfig` list that has `core` is a carried property: its `id` becomes the
  `path` of `core`, and it keeps its `value`. A property that `save.10` carries is also a carried property. An
  override with no carried property is not in the core panel.
- `save.10` A standard field option is a field option that Grafana gives to each panel, for example `unit` or
  `color`. Its id and its meaning are the same in each panel that registers it. A row with a core panel has
  `fieldOptions`: the id of each standard field option that the core panel registers in Grafana of
  `coreVersion`. The list does not have `links`, `actions` and `filterable`, because the chart has no data links
  and no filter buttons (`renderer.12`). An id is one key of `fieldConfig.defaults`. The core panel gets a
  standard field option of the list at the same place, and the chart needs no entry for it in
  `chart-options.json`:
  - A key of `fieldConfig.defaults` of the panel of the chart that is in `fieldOptions` is a carried option. Its
    value goes to the same key of `fieldConfig.defaults` of the core panel. The Source does not read the keys
    inside the value.
  - An override property whose `id` is in `fieldOptions` is a carried property. It keeps its `id` and its
    `value`.
  - An entry of the `fieldConfig` list whose `path` is in `fieldOptions` is read as an entry with a `core` of
    the `root` `fieldConfig` and that `path`. Thus the core panel also gets its `default` (`save.3`).

  For example, the `unit` of the arguments (`tool.22`) is in the core panel of each chart whose row has `unit`,
  also when the chart has no entry for `unit`. A core panel does not register each standard field option. For
  example, the core `heatmap` panel registers `unit` and no other option of the list, and the core `nodeGraph`
  panel registers none. Grafana removes a field option that the panel does not register, with no error. Thus
  the core panel gets a standard field option that is not in `fieldOptions` only at the `core` of its entry.
  With no such `core`, it is a dropped option (`save.5`).
- `save.5` The core panel does not have a dropped option. A dropped option is one of these:
  - An option of the panel of the chart whose entry has no `core`, and that `save.10` does not carry.
  - A path of the panel of the chart that is not an option of the chart, that is not a path of the `options` of
    the chart row (`save.3`), and that `save.10` does not carry.
  - An override property that is not carried.

  The map gives the list of the dropped options, in this order:
  1. `options.<path>` for each dropped option of `options`, in code point order.
  2. `fieldConfig.defaults.<path>` for each dropped option of `fieldConfig.defaults`, in code point order.
  3. `fieldConfig.overrides[<n>].<id>` for each dropped property, in the order of the overrides and of their
     properties. `<n>` is the position of the override in the panel of the chart, from 0. It also counts the
     overrides that are not in the core panel.
- `save.6` A save that writes the core panel saves it without the dropped options. It tells the user and the
  model each dropped option of the list.
- `save.7` A chart whose row has `none` has no core panel. When a save needs the core panel of such a chart, the
  save is refused: it writes no panel. It tells the user and the model the panel of the chart that the Grafana
  of the save cannot draw, and that the chart has no core panel. It names each chart that has one, in the order
  of `chart-types.json`. Thus the user can install the panel or pick another chart, and no dashboard gets a panel
  that its Grafana cannot draw.
- `save.8` A core panel does not draw each set of frames that its chart draws. A row can have `fits`: a list of
  conditions in the condition rule language of `registry.schema.json`. The frames fit the core panel when they
  fit the chart (`tool.20`) and one condition of `fits` matches. With no `fits`, the frames that fit the chart
  fit the core panel. For example, a `barchart` draws number fields with no other field, and the core `barchart`
  panel needs a string or time field. A core panel shows a message or no data for frames that do not fit it. The
  `fits` of a row come from the code of the core panel in Grafana of `coreVersion`. The core panel of `save.2` to
  `save.5` and `save.10` does not depend on the frames.
- `save.9` A Grafana of `coreVersion` or of a newer version reads the core panel, because it runs the migrations
  from `coreVersion`. An older Grafana does not know that form, and it ignores an option that it does not know.
  When a save needs the core panel and the version of the Grafana of the save is older than `coreVersion`, the
  save is refused: it writes no panel. It tells the user and the model the version of the Grafana and
  `coreVersion`.

  The Source compares only the major, the minor and the patch number of the two versions. It compares them as
  numbers, in that order. It does not read the text after the patch number, which is the pre-release part and
  the build part of Semantic Versioning 2.0.0. A Grafana reports a build of a version with such a part, for
  example `13.1.0-98765` in Grafana Cloud. In the precedence of Semantic Versioning 2.0.0, that build is older
  than the version with no part. Thus the precedence would refuse a build of `coreVersion`, and the Source does
  not use it.

  The version of the Grafana of the save is known when it has this form: three numbers with a `.` between them,
  and then nothing or a text that starts with `-` or `+`. A number has only the digits `0` to `9`. It is `0`, or
  it does not start with `0`. If the Source cannot read the version, or the version does not have this form, the
  save is also refused. It then tells the user and the model that the version is not known, and `coreVersion`.

## The time range

A save gets the tool arguments of the chart. The Source writes the dashboard from them. The saved panel is the
panel that the save adds to the dashboard.

The App keeps the `from` and the `to` of the last pick, zoom or pan in the last tool arguments (`refresh.9`). It
keeps them also if the refresh of that pick, zoom or pan fails. The chart on screen is then the old chart
(`refresh.5`). A zoom or a pan without `onRefresh` does not change the tool arguments (`renderer.42`). A save
from the App has the last tool arguments (`save.48`). Thus, in these two cases, the save has the time range of
the last tool arguments, and not the time range of the chart on screen.

`save.20` gives the time range of a save. It does not depend on the place of the save. `save.21` to `save.24`
are rules for a save to a dashboard only. If the contract later saves the chart to another place, for example a
notebook, that place needs its own rules for the time range.

- `save.20` The time range of a save is the `from` and the `to` of the tool arguments of the save. If the
  arguments have no `from` or no `to`, that value is `defaultFrom` or `defaultTo`, as in `tool.5`. A value that
  starts with `now` is a relative value, for example `now-6h`. For each other value, the Source uses the
  absolute time of the value: it resolves the value to epoch milliseconds at the time of the save, as in
  `tool.14`. For example, epoch milliseconds resolve to the same number, and `6h` resolves to the time of the
  save minus 6 hours. A dashboard does not read each format that `/api/ds/query` accepts (`tool.6`). Thus the
  Source writes only a relative value or an absolute time. The time range of a save is not `data.range`, because
  `data.range` is always absolute (`tool.14`).
- `save.21` A saved panel follows the time range of its dashboard. The Source writes no time range to the saved
  panel: no `timeFrom`, no `timeShift`, no `timeCompare` and no `hideTimeOverride`. A Grafana panel cannot keep
  an absolute time range. A panel with its own relative time range does not follow the time picker of the
  dashboard. Thus each saved panel acts in the same way, for a relative value and for an absolute time.
- `save.22` A save to a dashboard that exists does not change the time range of that dashboard. The other panels
  of the dashboard use that time range.
- `save.23` A save that makes a new dashboard writes the time range of the save as the time range of the
  dashboard. It writes `from` and `to` each on its own:
  - A relative value is written with no change. Thus a relative time range stays relative, and the dashboard
    moves with the clock, as the chart does (`refresh.3`).
  - An absolute time is written as an ISO 8601 time in UTC with milliseconds, for example
    `2026-01-01T00:00:00.000Z`. Grafana writes an absolute time of a dashboard in this form.
- `save.24` When a save gives the URL of the dashboard, the URL has the time range of the save in the query
  parameters `from` and `to`. A relative value is written with no change. An absolute time is written as epoch
  milliseconds. The Source then percent-encodes each character of the value that is not a letter of ASCII, a
  digit, `-`, `.`, `_` or `~`. For example, `now+15m` becomes `now%2B15m`, because a `+` in a query parameter
  reads as a space. This rule is stricter than the standard functions. `encodeURIComponent` of JavaScript does
  not encode `!`, `*`, `'`, `(` and `)`. `url.QueryEscape` of Go writes a space as `+`, and this rule gives
  `%20`. Thus the dashboard opens with the time range of the chart, also when the dashboard has
  another time range (`save.22`). The URL does not change the dashboard.

## The save tool

The App and the model ask for a save with the `save_chart` tool of mcp-grafana. The Source does the save.

Shapes: `schemas/save-chart-args.schema.json` gives the arguments of `save_chart`.
`schemas/save-chart-result.schema.json` gives the structured content of its result.

- `save.25` `save_chart` is a tool of mcp-grafana. It is a registered tool with no App, as `get_chart_options` is
  (`tool.43`). Thus a call does not draw a view, and `tool.3` does not apply to it. The model and the App can call
  it. The Source does the save.
- `save.26` The server lists `save_chart` only if it lists `get_chart_options` (`tool.43`) and it does not run with
  `--disable-write`. Thus a server with `--disable-write` and `--enable-query` draws a chart and cannot save it
  (`tool.2`). A server can also leave `save_chart` out.
- `save.27` The description of `save_chart` is one sentence: `Save a chart of render_grafana_app to a Grafana
  dashboard as a new panel.` The schema of its arguments does not repeat the schema of the tool arguments
  (`save.31`). Thus the tool list of a Host grows by a small amount only (`tool.47`).
- `save.28` The annotations of the tool have `readOnlyHint` `false`, `destructiveHint` `false` and `idempotentHint`
  `false`. A save is not destructive, because it only adds (`save.36`), and it cannot remove the change of
  another user (`save.37`). MCP takes a tool with no `destructiveHint` as destructive, so the tool sets it. A save
  is not idempotent: a second call with the same arguments adds a second panel.
- `save.29` When the server lists `save_chart`, the chart line of `tool.46` has one more sentence: `Chart:
  <chart>. get_chart_options lists its options. save_chart saves it to a dashboard.` Thus the model reads the
  name of the tool in the turn of the chart, and the tool list of a Host does not grow.

## The arguments

- `save.30` The target is the dashboard that gets the panel. The arguments give it in one of two ways:
  - `dashboardUid`: a dashboard that exists.
  - `title`: a new dashboard with this title. With a `folderUid`, the new dashboard is in that folder. With none,
    it is in the root folder of Grafana.

  Arguments with `dashboardUid` and `title`, or with none of the two, do not validate.
- `save.31` `chart` holds the tool arguments of the chart: the arguments of a `query_datasource` call. The schema
  gives `chart` as an object only. When the tool is called, the Source checks `chart` against the schema of the
  tool arguments, as in `tool.4`. `tool.10` applies to the queries of `chart`. `chart` must also have a `type`,
  because the Source does not query (`save.35`), so it cannot pick the chart (`tool.18`). The `from` and the `to`
  of `chart` give the time range of the save (`save.20`).
- `save.32` If the arguments do not validate, or `chart` does not pass the checks of `save.31`, the Source returns
  a tool error with the validation message. It does not read and does not write the dashboard.
- `save.33` The Source checks the `options` and the `fieldConfig` of `chart` as in `tool.38` to `tool.40`, before
  it reads the dashboard. If one is not correct, the Source returns the `invalid-options` tool error (`tool.39`),
  and it does not write.
- `save.34` The arguments are not a panel JSON, and they have no field for the place of the panel. The Source
  makes the panel and chooses its place.

## The write

- `save.35` The Source does not query the data source. Thus it does not check that the chart fits the data
  (`tool.20`), and it has no frames for the `fits` of a core panel (`save.8`).
- `save.36` A save only adds. It adds one panel to a dashboard that exists, or it makes a new dashboard with one
  panel. It never changes and never removes a panel that the dashboard has.
- `save.37` For a dashboard that exists, the Source reads the dashboard, adds the panel, and writes the dashboard
  with the version that it read. It never writes with overwrite. Thus Grafana refuses the write if the dashboard
  changed after the read. This applies to a dashboard with the v1 schema and to one with the v2 schema. In v1, the
  version is the `version` of the dashboard, and the write has `overwrite` `false`. In v2, the version is
  `metadata.resourceVersion`.
- `save.38` If Grafana refuses the write because the dashboard changed after the read, the Source returns the
  `save-conflict` tool error of `states.json`. The Source does not read and write a second time. A new call reads
  the dashboard again.
- `save.39` If Grafana refuses the read or the write because the user does not have the permission, the Source
  returns the `save-forbidden` tool error.
- `save.40` If the dashboard of `dashboardUid` or the folder of `folderUid` does not exist, the Source returns the
  `save-not-found` tool error. `<kind>` is `dashboard` or `folder`.
- `save.41` If the read or the write fails for another cause, the Source returns a tool error with the cause. Its
  text does not start with a code of `states.json`. If the save is refused (`save.7`, `save.9`), the Source
  returns a tool error whose text tells what those rules give to the user and the model. Each tool error of
  `save_chart` has the form of `tool.25`.

## The result

- `save.42` The structured content of the result has `dashboard` (the `uid` and the `title` of the dashboard),
  `panel` (the `id` and the `type` of the saved panel) and `dropped`. The result never has the dashboard JSON or
  the panel JSON.
- `save.43` If the Source knows a URL of its Grafana that a browser can open (`tool.27`), `dashboard.url` is that
  URL, then `/d/`, the UID of the dashboard, `?from=`, the `from` value of `save.24`, `&to=` and the `to` value
  of `save.24`. Otherwise `dashboard` has no `url`.
- `save.44` `dropped` is the list of the dropped options of the saved panel, in the form and the order of
  `save.5`. A save that writes the panel of the chart drops no option, so the list is empty. The Source saves the
  panel without the dropped options, and it returns no tool error for them (`save.6`).
- `save.45` The result also has one text item, with these lines in this order:
  1. `Saved <chart> as panel <id> (<type>) of the dashboard <uid>.` `<chart>` is the `type` of `chart`.
  2. `Title: <title>` The Source replaces each run of white space in the title with one space.
  3. `URL: <url>`, only if `dashboard` has a `url`.
  4. `Options not saved: <paths>.`, only if `dropped` is not empty. `<paths>` is the paths of `dropped`, joined
     with `, `.

  The model reads the text. The App reads the structured content. The two give the same values (`tool.28`).

## The App

- `save.46` Save is a control of the App, in its shell. The Renderer shows no Save control, and the Renderer API
  has no option for a save. The Renderer gives nothing to a save, and the form of a save needs the dashboards of
  Grafana, which the Renderer cannot read (`renderer.7`).
- `save.47` The user picks the target in a form of the App: a new dashboard with a title and an optional folder,
  or a dashboard that exists. How the App finds the dashboards and the folders of the form is not in this
  contract.
- `save.48` The App calls `save_chart` through the Host with the target and `chart`. `chart` is the last tool
  arguments (`refresh.8`), with the chart that the user sees as `type`. Thus the save has the chart that the user
  sees, and the time range of the last tool arguments (`save.20`). The chart on screen can show another time
  range: after a refresh that failed (`refresh.5`), and after a zoom or a pan without `onRefresh`
  (`renderer.42`). The save then still has the time range of the last tool arguments. After a refresh that
  failed, that is the time range that the user asked for. After a zoom or a pan without `onRefresh`, the App does
  not know the time range on screen, because the Renderer does not give it to the App. The App makes one call
  for each save. It does not ask the Source first which options a save drops. The result gives them (`save.44`).
- `save.49` While the App waits for the answer of the Host, it shows that it saves, and the user cannot save
  again, because a second call adds a second panel (`save.28`). The wait ends with the answer, or after
  `saveTimeoutMs` (`save.57`).
- `save.50` If the call gives a result, the App shows the title of the dashboard. If `dashboard` has a `url`, the
  App shows a link to it and opens it with `ui/open-link`, as in `spec.7`. If `dropped` is not empty, the App
  shows its paths.
- `save.51` If the call gives the `invalid-options` tool error, the App calls `save_chart` one more time, with a
  `chart` that has no `options` and no `fieldConfig`. A later Renderer version can rename or remove an option
  (`version.13`), as for a refresh (`refresh.19`). The App knows the error by its code (`refresh.10`). If the
  second call gives a result, the App also tells the user that the saved panel has the default options. The App
  does not change the last tool arguments. The next refresh handles them (`refresh.19`).
- `save.52` If a call gives another tool error, the App shows the message of the tool error in its shell. The
  form stays open, so the user can save again.
- `save.53` If the Host answers a call with a JSON-RPC error, the App does not know the cause. A tool error is not
  such an error, because it comes from the Source (`save.52`). The Host can refuse the call. The server can also
  have no `save_chart` (`save.26`):
  [MCP](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#error-handling) answers a call of a
  tool that the server does not list with a JSON-RPC error, and the App has no way to know if the server lists
  `save_chart`. The App then shows a short error in its shell. The error tells the user that the App could not
  save the chart, and that the user can ask the model in the chat to save it. If the App can send a text message
  (`state.20`), it also shows a control that sends the save to the chat. The App sends no message until the user
  uses that control, because the user can be the one who refused the call.
- `save.54` When the user uses that control, the App sends one message with `ui/message` of MCP Apps. The message
  has the `role` `user` and one text item, as in `state.21`. The text is the `save-chart` pattern of
  `messages.json`. `<arguments>` is the arguments of the call that got the JSON-RPC error, as one JSON object with
  no white space, as `JSON.stringify` gives it. The order of the keys is free. The model then calls `save_chart`
  with these arguments (`save.56`), and the Host applies its own rules to a tool call of the model. The pattern
  also tells a model that has no `save_chart` tool to tell the user that save is not available, and not to save
  the chart with another tool. Thus a server that does not list `save_chart` gets no panel from another tool
  (`save.53`). The App does not get the result of that save. The model reads it (`save.45`). `state.26` and
  `state.27` apply to the message.
- `save.55` If the text of `save.54` is longer than `maxSaveMessageChars`, the App does not show the control of
  `save.53`, and it sends no message. The length is in Unicode code points. `maxMessageChars` does not apply to
  this message, because the tool arguments of a chart with options or a long query are longer than a message
  about a point. The error of `save.53` still tells the user to ask the model in the chat (`save.56`).
- `save.57` The App waits for the answer of the Host to a call of `save_chart` for `saveTimeoutMs` or less. If the
  Host gives no answer in that time, the App stops the wait, and the user can save again (`save.49`). The App
  then does not know if the chart is saved, because the save can still complete. The App shows this in its
  shell, and it tells the user that a second save can add a second panel. An answer that comes after
  `saveTimeoutMs` is a late answer. A late result is a saved panel. The App shows it as in `save.50`, also if the
  user saved again. A late tool error and a late JSON-RPC error do nothing, because the user already saw that
  the App got no answer. A Host that asks the user before each tool call can take longer than `saveTimeoutMs`.
  The late result then shows the saved panel.

## The model

- `save.56` The model calls `save_chart` with a target and with the tool arguments that it wrote for the chart as
  `chart`. If those arguments have no `type`, the model adds the chart of the chart line (`tool.46`). After a
  message of `save.54`, the model uses the arguments of the message.
