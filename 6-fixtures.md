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
| `core-panel.json` | `panel`: the expected core panel of the panel of the set. `dropped`: the expected list of the dropped options | The part that makes the core panel |

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
  is an example with a few options of the time series chart. It is not the file of a Renderer.
  - `options`: the query of `prometheus-line` with a `type`, `options`, and a `fieldConfig` that has an override.
    One key of `options` has dots. The panel of the chart in `result.json` has the options as nested objects. The
    panels of the alternatives do not have them (`tool.41`). One option of `options` has no `core`, and two
    options have a `core` with the `root` `fieldConfig` (`fixtures.21`).
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
- `fixtures.21` Sets for the core panel. The smoke set of each chart that has a core panel has `core-panel.json`
  (`save.1`), and the set `options` has one. The smoke set of a chart with no core panel has none. The test makes
  the core panel of the `panel` of `spec.json`, or of the `panel` of `result.json` in a set with no `spec.json`.
  It uses the `chart-options.json` of the set `options` (`fixtures.17`). The core panel must equal `panel`, and
  the list of the dropped options must equal `dropped` (`save.2` to `save.5`). A smoke set has no chart option,
  so its core panel has only the preset of the row. The set `options` has a carried option of each `root`, a
  carried property of an override, and a dropped option.

## Conformance tests

- `fixtures.8` The Source test gives `args.json` to the Source. A fake `/api/ds/query` answers with the `status` and
  the `body` of `response.json`. The Source resolves relative times with `now` of `meta.json`, and its
  `data.capturedAt` is `capturedAt` of `meta.json`. If the set has
  `request.json`, the request body must equal it. The tool result must equal `result.json`, but the test does not
  compare `grafanaUrl`. If the `status` is not 200, one tool error for the whole call is also correct (`tool.16`).
- `fixtures.18` For a set of `fixtures.17`, the Source test gives the `chart-options.json` of the set `options` to
  the Source in place of the file of the Renderer. The test does not run the checks of `tool.48` on this file,
  because it has an entry for one chart only. A set with `options-args.json` is a test of
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
- `fixtures.9` The App test gives `args.json` and `result.json` to the App. The viz spec must equal `spec.json`.
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
