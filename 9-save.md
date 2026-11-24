# 9. Save

A save writes the chart to a Grafana dashboard. The rules of a save are not specified yet (`future.md`). This
file gives one part of them: the time range of a saved panel.

## The time range

A save gets the tool arguments of the chart. The Source writes the dashboard from them. The saved panel is the
panel that the save adds to the dashboard.

The App keeps the `from` and the `to` of the last pick, zoom or pan in the last tool arguments (`refresh.9`). It
keeps them also if the refresh of that pick, zoom or pan fails. The chart on screen is then the old chart
(`refresh.5`). A zoom or a pan without `onRefresh` does not change the tool arguments (`renderer.42`). No rule
says yet which tool arguments the App gives to a save. Thus, in these two cases, no rule says yet if the save
has the time range of the last tool arguments or the time range of the chart on screen. This question is in
item 3 of `future.md`.

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
