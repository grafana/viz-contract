# 9. Save

A save writes the chart to a Grafana dashboard. The rules of a save are not specified yet (`future.md`). This
file gives the part that a save needs first: the core panel of a chart.

A Grafana with no ECharts app cannot draw the panel of a chart (`tool.22`). It can draw a core Grafana panel. The
core panel of a chart is a core Grafana panel that draws the same data.

## The core panel

The map from a chart to its core panel has two parts. `registry/core-panels.json` gives the core panel of each
chart. The `chart-options.json` of the Renderer gives the place of each chart option in that core panel
(`delivery.25`). Thus the names of the options stay data of the Renderer (`version.13`). The Source makes the
core panel, because it reads both files (`tool.37`).

- `save.1` `registry/core-panels.json` has one row for each row of `registry/chart-types.json`, in the same
  order. The `panel` of a row is the type of the core panel of the chart, or `none`. A row with a core panel also
  has `options`: the options preset that the core panel gets. The preset has each option that the core panel
  needs to draw the data of the chart as the chart draws it. For example, the core `piechart` panel draws one
  part for each row only with `reduceOptions.values`. The core `heatmap` panel reads a panel with no options as
  a panel of an old version, and then it calculates the buckets from the values. Thus its preset has `calculate`.
- `save.2` The core panel is made from the panel of the chart (`tool.22`, `tool.41`) and the row of the chart:
  - `type` is the `panel` of the row.
  - `pluginVersion` is `coreVersion` of `chart-options.json` (`delivery.25`). Grafana then runs the migrations
    of the core panel from that version.
  - `options` starts as the `options` of the row.
  - `fieldConfig` has `defaults` and `overrides`. They start empty.
  - Each other key of the panel of the chart is in the core panel with no change, for example `title`.
- `save.3` The options of the panel of the chart are found key by key, as in `tool.38`: in `options` with the
  `options` list of the chart, and in `fieldConfig.defaults` with the `fieldConfig` list. An option whose entry
  has `core` is a carried option. Its value is written to the core panel at the `path` of `core`, as nested
  objects. With the `root` `options`, the path starts at `options`, and the value can replace a value of the
  preset. With the `root` `fieldConfig`, the path starts at `fieldConfig.defaults`. A path of the `options` of the
  chart row is not an option of the chart (`delivery.17`). The core panel does not get it, because the `type` and
  the preset of the core panel take its place.
- `save.4` Each override of the panel of the chart keeps its `matcher` with no change. A property whose `id` is
  the path of an entry with `core` is a carried property: its `id` becomes the `path` of `core`, and it keeps its
  `value`. An override with no carried property is not in the core panel.
- `save.5` A dropped option is an option whose entry has no `core`, a path that is not an option of the chart,
  or an override property that is not carried. The core panel does not have it. The map gives the list of the
  dropped options, in this order:
  1. `options.<path>` for each dropped option of `options`, in code point order.
  2. `fieldConfig.defaults.<path>` for each dropped option of `fieldConfig.defaults`, in code point order.
  3. `fieldConfig.overrides[<n>].<id>` for each dropped property, in the order of the overrides and of their
     properties. `<n>` is the position of the override in the panel of the chart, from 0.
- `save.6` A save that writes the core panel saves it without the dropped options. It tells the user and the
  model each dropped option of the list.
- `save.7` A chart whose row has `none` has no core panel. When a save needs the core panel of such a chart, the
  save is refused: it writes no panel. It tells the user and the model that the chart has no core panel, and it
  names each chart that has one, in the order of `chart-types.json`. Thus no dashboard gets a panel that its
  Grafana cannot draw.
