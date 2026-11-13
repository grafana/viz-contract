# 5. Refresh and the time picker

The user can ask for new data from the chart. The Renderer asks the App, and the App calls the tool again.

Shape: `onRefresh`, `RefreshRequest` and `setRefreshed` in `renderer-api.d.ts`.

## The Renderer

- `refresh.1` The Renderer shows a Refresh button and a time picker only when the App gives `onRefresh`.
- `refresh.2` When the user clicks Refresh, the Renderer calls `onRefresh` with the cause `refresh`.
- `refresh.3` When the user picks a time range, the Renderer calls `onRefresh` with the cause `timeRange` and the
  `from` and `to` of the pick. A relative pick, for example "Last 6 hours", gives a relative `from` and `to`, for
  example `now-6h` and `now`. Thus a later refresh moves with the clock. An absolute pick gives epoch milliseconds.
- `refresh.4` After the call of `onRefresh`, the chart is busy. The old chart stays. Refresh and the time picker are
  disabled.
- `refresh.5` The busy state ends at the first of these events:
  - The App calls `update`. The Renderer draws the new viz spec.
  - The App calls `setRefreshed(id, false, error)`. The old chart stays, and the Renderer shows the
    `refresh-failed` message of `states.json`. With no `error`, it shows `refresh-failed-no-detail`.
  - The App calls `setRefreshed(id, true)`. The chart does not change.
  - `refreshTimeoutMs` passes with no result. The Renderer shows `refresh-timeout`.
- `refresh.6` `setRefreshed` gives the result of the last `onRefresh` call only. A call with an `id` that is not
  the `id` of the last `RefreshRequest` does nothing. A call before the first `onRefresh`, a second call for the
  same refresh, and a call after the timeout also do nothing.
- `refresh.7` If `onRefresh` throws, the Renderer writes the error to `console.error` with the prefix
  `grafana-viz:`. The busy state ends as with `setRefreshed(<id>, false, <error message>)`. `<id>` is the `id` of
  this `RefreshRequest`.
- `refresh.13` The Renderer gives each `RefreshRequest` a new `id`. Two calls of `onRefresh` from the same handle
  never have the same `id`.
- `refresh.15` `update` removes the `refresh-failed`, `refresh-failed-no-detail` and `refresh-timeout` messages.
  Thus a late result after `refreshTimeoutMs` draws the new viz spec and removes `refresh-timeout`. A late
  `setRefreshed` does nothing (`refresh.6`), because the user already sees `refresh-timeout`.

## The App

- `refresh.8` The App keeps the last tool arguments. The first ones come from the tool input that the Host gives to
  the App. The App also keeps who chose the chart on screen: the model (the arguments have `type`), the user (a
  switch to an alternative), or the pick of the Source.
- `refresh.9` For a refresh, the App calls `render_grafana_app` through the Host with `toolName` `query_datasource`
  and the last tool arguments, with these changes:
  - If the model or the user chose the chart, `type` is the chart that the user sees. Thus that chart does not
    change under the user. If the pick of the Source chose the chart, the arguments have no `type`, and the Source
    picks again.
  - For the cause `timeRange`, `from` and `to` are the values of the `RefreshRequest`. The App keeps these arguments
    as the new last tool arguments.
- `refresh.10` If the call gives the `type-mismatch` tool error, the App calls `render_grafana_app` again with no
  `type`. It draws the chart of the result. If that chart is not the old chart, the App adds the `chart-changed`
  notice to the viz spec of this refresh only. The App knows the error by the code at the start of the text
  (`tool.25`).
- `refresh.11` If the call gives another tool error, the App calls `setRefreshed(<id>, false, <message>)`. `<id>`
  is the `id` of the `RefreshRequest` of the call.
- `refresh.12` If the call gives a tool result, the App makes a new viz spec (`spec.1` to `spec.8`, `spec.15`,
  `spec.17`) and calls `update`.
- `refresh.14` The App answers the last `RefreshRequest` only. If the call of an older `RefreshRequest` ends, the
  App does not call `update` for it. `update` has no `id`, so the Renderer cannot ignore an old result. A result of
  the last `RefreshRequest` after `refreshTimeoutMs` is not old. The App calls `update` for it (`refresh.15`).
