# 6. Fixtures

The fixtures are the conformance tests of the contract. Each component runs the fixtures of its part. The fixtures
are in `fixtures/`, one directory for each set.

## Files of a set

| File | Content | Used by |
| ---- | ------- | ------- |
| `args.json` | The tool arguments | Source, App |
| `request.json` | The expected `/api/ds/query` request body of the Source | Source |
| `response.json` | The `/api/ds/query` response: `status` (the HTTP status) and `body` | Source |
| `meta.json` | The clock of the set: `now` and `capturedAt`, in epoch milliseconds | Source, App |
| `result.json` | The expected tool result, or the expected tool error | Source, App |
| `spec.json` | The expected viz spec | App, Renderer |
| `state.json` | The expected state, error and notices of `onState` | Renderer |
| `message.json` | `cases`: a list. Each case has a `description`, a `request` (a `MessageRequest`), the expected `text` of the message or `null`, and `renderer`. With `renderer` `true`, the Renderer must give the `request` for a point of `spec.json` | App, Renderer |
| `chart-options.json` | A `chart-options.json`, as the Renderer build writes it | Source |
| `options-args.json` | The arguments of `get_chart_options` | Source |
| `options-result.json` | The expected tool result of `get_chart_options` | Source |
| `retry-args.json` | The expected tool arguments of the second call of a refresh | App |
| `save-args.json` | The arguments of `save_chart` | Source, App |
| `grafana.json` | The answers of the fake Grafana to a save: `read` for the read of the dashboard, and `write` for the write of the dashboard. An answer is `ok`, `conflict`, `forbidden` or `not-found` | Source |
| `save-result.json` | The expected result of `save_chart`, or the expected tool error | Source, App |
| `save-retry-args.json` | The expected arguments of the second call of a save | App |
| `core-panel.json` | `cases`: a list. Each case has a `description`, a `chart`, the `panel` of that chart, the expected `core` (the core panel, or `null` for a chart with no core panel) and the expected `dropped` list | Source |
| `core-fits.json` | `cases`: a list. Each case has a `description`, a `chart`, `results` (the frames, as `data.results` of a viz spec), and `fits`: `true` when the frames fit the core panel of the chart | Source |
| `core-version.json` | `cases`: a list. Each case has a `description`, a `version` (the version of the Grafana of the save, or `null` when the Source cannot read it) and the expected `result`: `allowed`, `older` or `not-known` | Source |
| `time-range.json` | `cases`: a list. Each case has a `description`, `args` (the `from` and the `to` of the tool arguments of a save, or none of them), the expected `dashboard` (the `from` and the `to` of a new dashboard) and the expected `url` (the values of the query parameters `from` and `to`) | Source |
| `available.json` | `cases`: a list. Each case has a `description`, `listed` (`true` when the server lists `save_chart`), `actions` (the Grafana actions of the user, each with the list of its scopes, or `null` when the Source cannot read them) and the expected `available` (the `available` of the `save` of the tool result) | Source |

- `fixtures.1` A set has only the files that its tests need. For example, a pick set has no `request.json`.
- `fixtures.2` `args.json`, `spec.json` and a `result.json` that holds a tool result validate against their schemas.
  The `spec.json` of an error set (`fixtures.12`) can break its schema on purpose.
- `fixtures.3` A test resolves relative times, for example `now-6h`, with `now` of `meta.json`. Thus the result is
  the same on each run.

## Sets

- `fixtures.4` Focus sets for the time series chart:
  - `prometheus-line`: a Prometheus range query with one series for each label value.
  - `no-data`: a query that gives frames with no rows.
  - `partial-error`: one correct query and one failed query. The response has the HTTP status 400, as Grafana gives
    for a partial failure.
  - `epoch-range`: `from` and `to` are integers. `request.json` has them as strings, with the default
    `maxDataPoints` and `intervalMs` (`tool.6`, `tool.12`).
  - `hostile-label`: series names and label values with HTML and script text. The Renderer shows them as text.
  - `title`: the query of `prometheus-line` with a `title` that has HTML text. Each panel of `result.json` and the
    panel of `spec.json` have the title (`tool.31`, `spec.15`). The Renderer shows it as text (`renderer.17`).
  - `hostile-message`: the set has `spec.json`, `state.json` and `message.json` only. The title, the series names
    and the labels have quotes, HTML text, control characters and characters that do not show. One series has more
    labels than `maxMessageLabels`. `spec.json` has a `timeZone`, so the text of x does not depend on the browser.
    The cases of `message.json` cover each step of `state.23`, each pattern of `messages.json`, and the length rule
    of `state.25`. A case with `renderer` `true` is a point of `spec.json`. A case with `renderer` `false` tests
    the App only. Its series or its point can be absent from `spec.json`, for example a category x, because the
    App uses the `request` as it is.
  - `message-no-title`: the same files, with no `panel.title`. The text has the panel type (`state.22`).
  - `too-large`: the set has `args.json` and `meta.json` only. The test makes the response at run time: it repeats
    the frames of `prometheus-line` with new label values until the tool result is larger than `maxResultBytes`.
    The expected result is the `too-large` tool error.
- `fixtures.5` One smoke set for each row of `registry/chart-types.json`. It has `spec.json` and `state.json` with
  the state `ready`. A test makes sure that each row has a set.
- `fixtures.6` One pick set for each rule of `registry/pick.json`. It has the frames and the expected chart name. A
  test makes sure that each rule has a set.
- `fixtures.7` One `type-mismatch` set. Its `result.json` is the expected tool error.
- `fixtures.17` Sets for the chart options. Each one uses the `chart-options.json` of the set `options`. That file
  is an example with a few options of the time series chart and one option of the pie chart. It is not the file
  of a Renderer.
  - `options`: the query of `prometheus-line` with a `type`, `options`, and a `fieldConfig` that has an override.
    One key of `options` has dots. The panel of the chart in `result.json` has the options as nested objects. The
    panels of the alternatives do not have them (`tool.41`).
  - `options-invalid`: each problem of `tool.38` to `tool.40`. The set has no `response.json`, because the Source
    does not query. The expected result is the `invalid-options` tool error. The arguments have these parts:
    - In `options`: a path that is not an option, the same path from two keys, a path that is set two times, a
      value that does not validate, and a value that must be an object. Two keys are not ASCII: `Ａ` (U+FF21) and
      `😀` (U+1F600). Their problems are in code point order, which is not the order of their UTF-16 code units
      (`tool.39`).
    - In `fieldConfig.defaults`: a path that is not an option, a path that is set two times, and a value that does
      not validate. The arguments also have a `unit`, and the defaults give `unit`, so that path is set two times
      (`tool.38`).
    - In the first override: an `id` that is not an option, a value that does not validate, and an `id` that is
      set two times.
    - Two overrides that do not have the override form: one has the matcher `byRegexp`, which is not allowed
      (`tool.40`), and one has no `properties`.
    - A key of `fieldConfig` that is not `defaults` or `overrides`.
  - `options-stale`: a refresh after a Renderer version removed an option (`refresh.19`). `args.json` is the last
    tool arguments of the App. Its `options` have one option of the chart, and one path that is not an option. Its
    `fieldConfig` is correct. `result.json` is the `invalid-options` tool error. `retry-args.json` is `args.json`
    with no `options` and no `fieldConfig`. The set has no `response.json`, because the Source does not query.
  - `options-list`: `get_chart_options` with no `advanced`. The text has the line of the advanced options that
    are not listed (`tool.44`).
  - `options-list-advanced`: `get_chart_options` with `advanced` set to true.
  - `options-list-unknown`: `get_chart_options` with a `type` that is not a chart. The expected result is the
    `unknown-chart` tool error (`tool.43`).
- `fixtures.20` One `options-legend` set for a legend action on a series that has an override of the viz spec
  (`renderer.69`). It has `spec.json` and `state.json`, with the data of `prometheus-line`. One override of
  `panel.fieldConfig` gives the series `/api/health` a fixed `color` and a line style. Only the Renderer test uses
  the set. The test draws `spec.json`, and picks another color for that series in the legend. The series must then
  have the color of the legend and the line style of the override. The same must be true after an `update` with
  the same viz spec (`renderer.35`).
- `fixtures.21` One `core-panel` set. It has `core-panel.json`, `core-fits.json` and `core-version.json` only.
  For each case of `core-panel.json`, the Source test makes the core panel of `panel` for the chart `chart`,
  with the `chart-options.json` of the set `options` (`fixtures.17`) and `coreVersion`. The core panel must
  equal `core`, and the list of the dropped options must equal `dropped` (`save.2` to `save.5`, `save.10`).
  With a `core` of `null`, the chart has no core panel (`save.7`). The cases cover these parts:
  - Each chart that has a core panel, with a panel that has no chart option. For a chart with an entry in
    `chart-options.json`, the core panel has the `default` of each entry with `core` (`save.3`).
  - One chart with no core panel.
  - Carried options of each `root`, and a carried option that replaces a value of the preset.
  - A dropped option of `options`, of `fieldConfig.defaults` and of an override. One override has no carried
    property, and the override after it has a dropped property, so `<n>` counts both (`save.5`).
  - Three paths that are not options of the chart, next to a path of the chart row. Two of them are not ASCII,
    so their code point order is not the order of their UTF-16 code units (`save.5`).
  - Each part of `save.10`: a standard field option of `fieldConfig.defaults` and of an override that has no
    entry, a standard field option whose entry has a `default` and no `core`, and a standard field option of
    `fieldConfig.defaults` and of an override that the core panel does not register.

  For each case of `core-fits.json`, the frames of `results` fit the chart `chart`. The test makes sure that
  they fit the core panel only when `fits` is `true` (`save.8`). Each row of `core-panels.json` that has `fits`
  has one case of each kind. A check also makes sure that the data of the smoke set of each chart fits its core
  panel.

  For each case of `core-version.json`, the Source test gives `version` as the version of the Grafana of a save
  that needs the core panel, with `coreVersion` (`save.9`). With the `result` `allowed`, the save is not refused
  for its version. With `older`, the save is refused, and it tells the version and `coreVersion`. With
  `not-known`, the save is refused, and it tells that the version is not known. The cases cover these parts:
  - The version `coreVersion`, a newer version and an older version. One newer and one older version have a
    number of two digits next to a number of one digit, so a compare of the text gives the wrong order.
  - A build of `coreVersion` with a pre-release part and with a build part, and a build of an older version.
  - A version that the Source cannot read, and each kind of version that does not have the form of `save.9`.
- `fixtures.30` One `save-time-range` set. It has `time-range.json`, and a `meta.json` with `now` only. For each
  case of `time-range.json`, the Source test gives `args` as the `from` and the `to` of the tool arguments of a
  save, and `now` as the time of the save. The time range of a new dashboard must equal `dashboard` (`save.23`).
  The values of the query parameters `from` and `to` of the URL must equal `url` (`save.24`). The cases cover
  these parts:
  - A relative value, and arguments with no `from` and no `to`.
  - Epoch milliseconds as an integer and as a string.
  - An absolute time next to a relative value.
  - A value that does not start with `now` and is not epoch milliseconds (`save.20`).
  - A relative value with a character that the URL percent-encodes.
- `fixtures.31` One set or more for each tool error of `save_chart` that has a code in `states.json`. Each set
  has `save-args.json`, and its `save-result.json` is the expected tool error. The `type` of each `chart` is the
  chart of the set `prometheus-line`.
  - `save-conflict`: a dashboard that exists. The write gets the answer `conflict` (`save.38`). The set also has
    `args.json`. It is the `args.json` of the set `prometheus-line`, which has no `type`. The `chart` of
    `save-args.json` is these arguments with the chart of that set as `type` (`save.48`).
  - `save-forbidden`: a dashboard that exists. The write gets the answer `forbidden` (`save.39`).
  - `save-not-found`: the read of the dashboard gets the answer `not-found`. `<kind>` is `dashboard` (`save.40`).
  - `save-not-found-folder`: a new dashboard in a folder. The write gets the answer `not-found`. `<kind>` is
    `folder`.
  - `save-invalid-options`: the `chart` is the `args.json` of the set `options-stale`. The expected result is the
    `invalid-options` tool error (`save.33`). The set has no `grafana.json`, because the Source does not read the
    dashboard. `save-retry-args.json` is `save-args.json` with a `chart` that has no `options` and no
    `fieldConfig` (`save.51`).
- `fixtures.35` One `save-result` set for a save that works. It has `save-args.json` and `save-result.json`
  only. `save-result.json` is a result: one text item and the structured content (`save.42` to `save.45`). The
  saved panel is the core panel of the chart. The `chart` has options that the core panel gets, and one option
  of `options` and one of `fieldConfig.defaults` that it drops, so `dropped` has two paths in the order of
  `save.5`. `dashboard.url` has the time range of the `chart` (`save.43`). Only the App test uses the set
  (`fixtures.33`, `fixtures.34`). The Source test does not, because the set does not give the dashboard that the
  ID of the saved panel comes from. A check makes sure that the text, `dashboard.url` and `dropped` follow from
  the structured content and the `chart`.
- `fixtures.36` Two sets for the `save` of the tool result (`tool.51`). Each set has `args.json`, `result.json`
  and `spec.json` only. `args.json` and `spec.json` are the files of the set `epoch-range`. `result.json` is the
  `result.json` of that set with a `save`. Thus `spec.json` has no `save` (`save.58`). Only the App test uses
  these sets (`fixtures.37`). The Source test does not, because it does not compare `save` (`fixtures.8`).
  - `save-available`: the `available` of `save` is `true`.
  - `save-not-available`: the `available` of `save` is `false`.
- `fixtures.38` One `save-actions` set. It has `available.json` only. For each case, the Source test makes a
  server that lists `save_chart` only if `listed` is `true`. It gives `actions` to the Source as the actions of
  the user. With an `actions` of `null`, the Source cannot read the actions. The test then calls the Source, for
  example with the files of the set `epoch-range`. The `available` of the `save` of the tool result must equal
  `available` (`tool.51`). How the test gives the actions to the Source is not in this contract. The cases cover
  these parts:
  - `dashboards:write` with no `dashboards:create`: for all dashboards, for one folder only, and for one
    dashboard only.
  - `dashboards:create` with no `dashboards:write`.
  - Other actions only, and no action.
  - Actions that the Source cannot read.
  - A server that does not list `save_chart`, with a user who has `dashboards:write`.

## Conformance tests

- `fixtures.8` The Source test gives `args.json` to the Source. A fake `/api/ds/query` answers with the `status` and
  the `body` of `response.json`. The Source resolves relative times with `now` of `meta.json`, and its
  `data.capturedAt` is `capturedAt` of `meta.json`. If the set has
  `request.json`, the request body must equal it. The tool result must equal `result.json`, but the test does not
  compare `grafanaUrl` and `save`. The test of `fixtures.38` covers `save`. If the `status` is not 200, one tool error for the whole call is also correct (`tool.16`).
- `fixtures.18` For a set of `fixtures.17`, the Source test gives the `chart-options.json` of the set `options` to
  the Source in place of the file of the Renderer. The test does not run the checks of `tool.48` on this file,
  because it has an entry for two charts only. A set with `options-args.json` is a test of
  `get_chart_options`: the test gives `options-args.json` to the tool, and the tool result must equal
  `options-result.json`. `chart-options.json` and `options-args.json` validate against their schemas, as the files
  of `fixtures.2` do.
- `fixtures.19` For a set with `retry-args.json`, the App test shows a chart whose last tool arguments are
  `args.json`, and the Renderer asks for a refresh with the cause `refresh`. The test answers the first call with
  `result.json`. The tool arguments of the second call must equal `retry-args.json`. `retry-args.json` validates
  against the schema of the tool arguments. It is the `args.json` of the set `prometheus-line` with the `type` of
  the chart of that set. Thus the test answers the second call with the `result.json` of the set
  `prometheus-line`. The viz spec of the `update` must equal the `spec.json` of that set with one more field: a
  `notices` list that has only the `options-dropped` notice (`refresh.19`).
- `fixtures.32` For a set of `fixtures.31`, the Source test gives `save-args.json` to `save_chart`. The
  Source uses the `chart-options.json` of the set `options`, as in `fixtures.18`. A fake Grafana gives the answer
  `read` of `grafana.json` to the read of the dashboard, and the answer `write` to the write of the dashboard.
  For `conflict`, `forbidden` and `not-found`, it answers as Grafana does in that case. For the `read` `ok`, it
  gives a dashboard that the test makes, with the UID of the arguments. `grafana.json` has a `read` only if the
  arguments have a `dashboardUid`, and it has a `write` only if the Source can get to the write. The test runs a
  set that has a `read` two times: with a dashboard of the v1 schema, and with a dashboard of the v2 schema
  (`save.37`). The tool result must equal `save-result.json`. With no `grafana.json`, the Source must make no
  request to Grafana. With no `write`, it must make no write. `save-args.json` and `save-retry-args.json`
  validate against the schema of the arguments of `save_chart`.
- `fixtures.33` For a set with `save-args.json`, the App test draws the chart of the set `prometheus-line` with
  the `result.json` of that set. The test adds a `save` with the `available` `true` to that tool result, so the
  App shows the Save control (`save.58`). If the set has `args.json`, the last tool arguments of the App are
  `args.json`.
  Otherwise they are the `chart` of `save-args.json`. The user saves the chart to the target of `save-args.json`.
  The arguments of the call of `save_chart` must equal `save-args.json`. The test answers the call with
  `save-result.json`. If the set has `save-retry-args.json`, the App must call `save_chart` a second time, and
  the arguments of that call must equal `save-retry-args.json` (`save.51`). Otherwise the App must make no second
  call. If `save-result.json` is a tool error, the App must show the message of the tool error (`save.52`). If
  it is a result, the App must show the title of the dashboard, a link to `dashboard.url` and each path of
  `dropped` (`save.50`).
- `fixtures.34` For a set with `save-args.json`, the App test also runs the save of `fixtures.33` with a Host
  that answers the call of `save_chart` with a JSON-RPC error. The App must send no message before the user uses
  the control of `save.53`. Then it must send one message. The text must be the `save-chart` pattern of
  `messages.json`, and its `<arguments>` must be JSON with no white space that equals `save-args.json`
  (`save.54`). Thus the text of each set is not longer than `maxSaveMessageChars`.
- `fixtures.9` The App test gives `args.json` and `result.json` to the App. The viz spec must equal `spec.json`.
- `fixtures.37` In the test of `fixtures.9`, the App must show the Save control if `result.json` has a `save`
  whose `available` is `true` (`save.58`). Otherwise it must show none. Thus the App shows the control for the
  set `save-available`. It
  shows no control for the set `save-not-available`, and for a set whose `result.json` has no `save`, for example
  `prometheus-line`.
- `fixtures.10` The Renderer test draws `spec.json`. The value of `onState` must equal `state.json`.
- `fixtures.11` Before a consumer copies a set into another repository, it makes sure that no recorded response
  has a secret, an internal host name or a private URL.
- `fixtures.12` One error set for each of the errors `invalid-spec`, `unsupported-spec-version`,
  `unsupported-panel-type` and `all-queries-failed` of `states.json`. It has `spec.json` and a `state.json` with the
  state `error` and the error code. The `all-queries-failed` set has two failed queries (`state.18`).
- `fixtures.13` Focus sets for the gauge chart and the stat chart. Each set has `spec.json` and `state.json`. Only
  the Renderer test uses them (`fixtures.10`):
  - `gauge-thresholds` and `stat-thresholds`: `panel.fieldConfig.defaults` has the unit `percent`, a `min`, a `max`
    and three threshold steps. No tool argument sets these fields. The state is `ready`.
  - `gauge-no-data` and `stat-no-data`: the frame has a number field and no rows. The state is `no-data`
    (`state.4`).
- `fixtures.14` Pick sets for the limits of the rule `single-value`. The number fields count over all frames:
  - `pick-single-value-frames`: three frames with one row each, as a Prometheus instant query gives. The chart is
    `stat`.
  - `pick-single-value-over-limit`: eleven such frames. That is more number fields than the rule allows, so the
    chart is the chart of the rule `default`.
- `fixtures.15` The App test draws `spec.json`. For each case of `message.json`, it calls the `onMessage` of the App
  with the `request`. The text of the message that the App sends must equal `text`. If `text` is `null`, the App
  must send no message (`state.25`).
- `fixtures.16` The Renderer test draws `spec.json` with `onMessage`. For each case of `message.json` with
  `renderer` `true`, it opens the tooltip at the x of `point.xRaw`, and clicks Ask in chat for the series
  `series.name`. `onMessage` must get one `MessageRequest` that equals `request` (`renderer.31`, `renderer.32`).
