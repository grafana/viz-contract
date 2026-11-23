# 9. Save

A save writes the chart to a Grafana dashboard. The rules of a save are not specified yet (`future.md`). This
file gives the part that a save needs first: the time range of a saved panel.

## The time range

A save gets the tool arguments of the chart. The Source writes the dashboard from them. The saved panel is the
panel that the save adds to the dashboard.

- `save.10` The time range of a save is the `from` and the `to` of the tool arguments of the save. If the
  arguments have no `from` or no `to`, that value is `defaultFrom` or `defaultTo`, as in `tool.5`. A value of
  epoch milliseconds is an absolute value (`tool.6`). Each other value is a relative value, for example `now-6h`.
  The time range of a save is not `data.range`, because `data.range` is always absolute (`tool.14`).
- `save.11` The App keeps the `from` and the `to` of the last pick, zoom or pan in the last tool arguments
  (`refresh.9`). Thus a save with the last tool arguments has the time range that the user sees. A zoom or a pan
  without `onRefresh` does not change the tool arguments (`renderer.42`). Thus a save does not have that zoom or
  pan.
- `save.12` A saved panel follows the time range of its dashboard. The Source writes no time range to the saved
  panel: no `timeFrom`, no `timeShift` and no `hideTimeOverride`. A Grafana panel cannot keep an absolute time
  range. A panel with its own relative time range does not follow the time picker of the dashboard. Thus each
  saved panel acts in the same way, for a relative and for an absolute time range of the save.
- `save.13` A save to a dashboard that exists does not change the time range of that dashboard. The other panels
  of the dashboard use that time range.
- `save.14` A save that makes a new dashboard writes the time range of the save as the time range of the
  dashboard. It writes `from` and `to` each on its own:
  - A relative value is written with no change. Thus a relative time range stays relative, and the dashboard
    moves with the clock, as the chart does (`refresh.3`).
  - An absolute value is written as an ISO 8601 time in UTC with milliseconds, for example
    `2026-01-01T00:00:00.000Z`. Grafana writes an absolute time of a dashboard in this form.
- `save.15` When a save gives the URL of the dashboard, the URL has the time range of the save in the query
  parameters `from` and `to`. A relative value is written with no change. An absolute value is written as epoch
  milliseconds. Thus the dashboard opens with the time range of the chart, also when the dashboard has another
  time range (`save.13`). The URL does not change the dashboard.
