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
    panels of the alternatives do not have them (`tool.41`).
  - `options-invalid`: a path that is not an option, a value that does not validate, a value that must be an
    object, and a path that is set two times, in `options`, in `fieldConfig.defaults` and in an override. It also
    has an override and a key of `fieldConfig` that do not have the form of `tool.40`. The set has no `response.json`, because
    the Source does not query. The expected result is the `invalid-options` tool error (`tool.39`).
  - `options-list`: `get_chart_options` with no `advanced`. The text has the line of the advanced options that
    are not listed (`tool.44`).
  - `options-list-advanced`: `get_chart_options` with `advanced` set to true.
  - `options-list-unknown`: `get_chart_options` with a `type` that is not a chart. The expected result is the
    `unknown-chart` tool error (`tool.43`).

## Conformance tests

- `fixtures.8` The Source test gives `args.json` to the Source. A fake `/api/ds/query` answers with the `status` and
  the `body` of `response.json`. The Source resolves relative times with `now` of `meta.json`, and its
  `data.capturedAt` is `capturedAt` of `meta.json`. If the set has
  `request.json`, the request body must equal it. The tool result must equal `result.json`, but the test does not
  compare `grafanaUrl`. If the `status` is not 200, one tool error for the whole call is also correct (`tool.16`).
- `fixtures.18` For a set of `fixtures.17`, the Source test gives the `chart-options.json` of the set `options` to
  the Source in place of the file of the Renderer. A set with `options-args.json` is a test of
  `get_chart_options`: the test gives `options-args.json` to the tool, and the tool result must equal
  `options-result.json`.
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
