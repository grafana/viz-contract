# 9. Save to a dashboard

The user can keep a chart of the conversation. The Source saves it as a new panel of a Grafana dashboard. The App
and the model only ask for the save, with the `save_chart` tool of mcp-grafana.

Shapes: `schemas/save-chart-args.schema.json` gives the arguments of `save_chart`.
`schemas/save-chart-result.schema.json` gives the structured content of its result.

These parts of a save are not specified yet ([future.md](future.md)): the JSON of the saved panel, its place in
the dashboard, its time range, and the map from a chart to a core Grafana panel.

## The tool

- `save.1` `save_chart` is a tool of mcp-grafana. It is a registered tool with no App, as `get_chart_options` is
  (`tool.43`). Thus a call does not draw a view, and `tool.3` does not apply to it. The model and the App can call
  it. The Source does the save.
- `save.2` The server lists `save_chart` only if it lists `get_chart_options` (`tool.43`) and it does not run with
  `--disable-write`. Thus a server with `--disable-write` and `--enable-query` draws a chart and cannot save it
  (`tool.2`). A server can also leave `save_chart` out.
- `save.3` The description of `save_chart` is one sentence: `Save a chart of render_grafana_app to a Grafana
  dashboard as a new panel.` The schema of its arguments does not repeat the schema of the tool arguments
  (`save.7`). Thus the tool list of a Host grows by a small amount only (`tool.47`).
- `save.4` The annotations of the tool have `readOnlyHint` `false`, `destructiveHint` `false` and `idempotentHint`
  `false`. A save is not destructive, because it only adds (`save.12`), and it cannot remove the change of
  another user (`save.13`). MCP takes a tool with no `destructiveHint` as destructive, so the tool sets it. A save
  is not idempotent: a second call with the same arguments adds a second panel.
- `save.5` When the server lists `save_chart`, the chart line of `tool.46` has one more sentence: `Chart:
  <chart>. get_chart_options lists its options. save_chart saves it to a dashboard.` Thus the model reads the
  name of the tool in the turn of the chart, and the tool list of a Host does not grow.

## The arguments

- `save.6` The target is the dashboard that gets the panel. The arguments give it in one of two ways:
  - `dashboardUid`: a dashboard that exists.
  - `title`: a new dashboard with this title. With a `folderUid`, the new dashboard is in that folder. With none,
    it is in the root folder of Grafana.

  Arguments with `dashboardUid` and `title`, or with none of the two, do not validate.
- `save.7` `chart` holds the tool arguments of the chart: the arguments of a `query_datasource` call. The schema
  gives `chart` as an object only. When the tool is called, the Source checks `chart` against the schema of the
  tool arguments, as in `tool.4`. `tool.10` applies to the queries of `chart`. `chart` must also have a `type`,
  because the Source does not query (`save.11`), so it cannot pick the chart (`tool.18`).
- `save.8` If the arguments do not validate, or `chart` does not pass the checks of `save.7`, the Source returns a
  tool error with the validation message. It does not read and does not write the dashboard.
- `save.9` The Source checks the `options` and the `fieldConfig` of `chart` as in `tool.38` to `tool.40`, before
  it reads the dashboard. If one is not correct, the Source returns the `invalid-options` tool error (`tool.39`),
  and it does not write.
- `save.10` The arguments are not a panel JSON, and they have no field for the place of the panel. The Source
  makes the panel and chooses its place.

## The write

- `save.11` The Source does not query the data source. Thus it does not check that the chart fits the data
  (`tool.20`).
- `save.12` A save only adds. It adds one panel to a dashboard that exists, or it makes a new dashboard with one
  panel. It never changes and never removes a panel that the dashboard has.
- `save.13` For a dashboard that exists, the Source reads the dashboard, adds the panel, and writes the dashboard
  with the version that it read. It never writes with overwrite. Thus Grafana refuses the write if the dashboard
  changed after the read. This applies to a dashboard with the v1 schema and to one with the v2 schema. In v1, the
  version is the `version` of the dashboard, and the write has `overwrite` `false`. In v2, the version is
  `metadata.resourceVersion`.
- `save.14` If Grafana refuses the write because the dashboard changed after the read, the Source returns the
  `save-conflict` tool error of `states.json`. The Source does not read and write a second time. A new call reads
  the dashboard again.
- `save.15` If Grafana refuses the read or the write because the user does not have the permission, the Source
  returns the `save-forbidden` tool error.
- `save.16` If the dashboard of `dashboardUid` or the folder of `folderUid` does not exist, the Source returns the
  `save-not-found` tool error. `<kind>` is `dashboard` or `folder`.
- `save.17` If the read or the write fails for another cause, the Source returns a tool error with the cause. Its
  text does not start with a code of `states.json`. Each tool error of `save_chart` has the form of `tool.25`.

## The result

- `save.18` The structured content of the result has `dashboard` (the `uid` and the `title` of the dashboard),
  `panel` (the `id` and the `type` of the saved panel) and `dropped`. The result never has the dashboard JSON or
  the panel JSON.
- `save.19` If the Source knows a URL of its Grafana that a browser can open (`tool.27`), `dashboard.url` is that
  URL, then `/d/`, then the UID of the dashboard. Otherwise `dashboard` has no `url`.
- `save.20` `dropped` lists the path of each option of `chart` that the saved panel does not have. A path has the
  form of `<path>` in `tool.39`, and the paths are in the order of the problems of `tool.39`. A panel that has
  each option gives an empty list. The Source saves the panel without a dropped option, and it returns no tool
  error for it.
- `save.21` The result also has one text item, with these lines in this order:
  1. `Saved <chart> as panel <id> (<type>) of the dashboard <uid>.` `<chart>` is the `type` of `chart`.
  2. `Title: <title>` The Source replaces each run of white space in the title with one space.
  3. `URL: <url>`, only if `dashboard` has a `url`.
  4. `Options not saved: <paths>.`, only if `dropped` is not empty. `<paths>` is the paths of `dropped`, joined
     with `, `.

  The model reads the text. The App reads the structured content. The two give the same values (`tool.28`).

## The App

- `save.22` Save is a control of the App, in its shell. The Renderer shows no Save control, and the Renderer API
  has no option for a save. The Renderer gives nothing to a save, and the form of a save needs the dashboards of
  Grafana, which the Renderer cannot read (`renderer.7`).
- `save.23` The user picks the target in a form of the App: a new dashboard with a title and an optional folder,
  or a dashboard that exists. How the App finds the dashboards and the folders of the form is not in this
  contract.
- `save.24` The App calls `save_chart` through the Host with the target and `chart`. `chart` is the last tool
  arguments (`refresh.8`), with the chart that the user sees as `type`. Thus the save has the time range and the
  chart that the user sees. The App makes one call for each save. It does not ask the Source first which options
  a save drops. The result gives them (`save.20`).
- `save.25` While the App waits for the result, it shows that it saves, and the user cannot save again, because a
  second call adds a second panel (`save.4`).
- `save.26` If the call gives a result, the App shows the title of the dashboard. If `dashboard` has a `url`, the
  App shows a link to it and opens it with `ui/open-link`, as in `spec.7`. If `dropped` is not empty, the App
  shows its paths.
- `save.27` If the call gives the `invalid-options` tool error, the App calls `save_chart` one more time, with a
  `chart` that has no `options` and no `fieldConfig`. A later Renderer version can rename or remove an option
  (`version.13`), as for a refresh (`refresh.19`). The App knows the error by its code (`refresh.10`). If the
  second call gives a result, the App also tells the user that the saved panel has the default options. The App
  does not change the last tool arguments. The next refresh handles them (`refresh.19`).
- `save.28` If a call gives another tool error, the App shows the message of the tool error in its shell. The
  form stays open, so the user can save again.
- `save.29` The Host refuses a call when it answers the call with a JSON-RPC error. A tool error is not a
  refusal, because it comes from the Source (`save.28`). If the Host refuses the call, the App shows a short error
  in its shell. If the App can send a text message (`state.20`), it also shows a control that sends the save to
  the chat. The App sends no message until the user uses that control, because the user can be the one who
  refused the call.
- `save.30` When the user uses that control, the App sends one message with `ui/message` of MCP Apps. The message
  has the `role` `user` and one text item, as in `state.21`. The text is the `save-chart` pattern of
  `messages.json`. `<arguments>` is the arguments of the call that the Host refused, as one JSON object with no
  white space, as `JSON.stringify` gives it. The order of the keys is free. The model then calls `save_chart` with
  these arguments (`save.32`), and the Host applies its own rules to a tool call of the model. The App does not
  get the result of that save. The model reads it (`save.21`). `state.26` and `state.27` apply to the message.
- `save.31` If the text of `save.30` is longer than `maxMessageChars`, the App does not show the control of
  `save.29`, and it sends no message. The length is in Unicode code points. The user can still ask the model in
  the chat to save the chart (`save.32`).

## The model

- `save.32` The model calls `save_chart` with a target and with the tool arguments that it wrote for the chart as
  `chart`. If those arguments have no `type`, the model adds the chart of the chart line (`tool.46`). After a
  message of `save.30`, the model uses the arguments of the message.
