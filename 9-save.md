# 9. Save

A save writes the chart to a Grafana dashboard. The rules of a save are not specified yet (`future.md`). This
file gives the part that a save needs first: the core panel of a chart.

The panel of a chart is a Grafana panel plugin (`tool.22`). A Grafana can draw it only when that plugin is
installed. Each Grafana can draw a core Grafana panel. The core panel of a chart is the core Grafana panel that
is nearest to the chart. A save needs the core panel when the Grafana of the save cannot draw the panel of the
chart.

## The core panel

The map from a chart to its core panel has two parts. `registry/core-panels.json` gives the core panel of each
chart. The `chart-options.json` of the Renderer gives the place of each chart option in that core panel
(`delivery.25`). Thus the names of the options stay data of the Renderer (`version.13`). The Source makes the
core panel, because it reads both files (`tool.37`). Both parts are written for Grafana of `coreVersion`.

- `save.1` `registry/core-panels.json` has one row for each row of `registry/chart-types.json`, in the same
  order. The `panel` of a row is the type of the core panel of the chart, or `none`. A row with a core panel also
  has `options`: the options preset that the core panel gets. The preset has each option that the core panel
  needs to draw the data of the chart as the chart draws it. For example, the core `piechart` panel draws one
  part for each row only with `reduceOptions.values`. The core `heatmap` panel reads a panel with no options as
  a panel of an old version, and then it calculates the buckets from the values. Thus its preset has `calculate`.
- `save.8` A core panel does not draw each set of frames that its chart draws. A row can have `fits`: a list of
  conditions in the condition rule language of `registry.schema.json`. The frames fit the core panel when they
  fit the chart (`tool.20`) and one condition of `fits` matches. With no `fits`, the frames that fit the chart
  fit the core panel. For example, a `barchart` draws number fields with no other field, and the core `barchart`
  panel needs a string or time field. A core panel shows a message or no data for frames that do not fit it. The
  core panel of `save.2` to `save.5` does not depend on the frames.
- `save.2` The core panel is made from the panel of the chart (`tool.22`, `tool.41`) and the row of the chart:
  - `type` is the `panel` of the row.
  - `pluginVersion` is `coreVersion`. Grafana then runs the migrations of the core panel from that version.
  - `options` starts as the `options` of the row.
  - `fieldConfig` has `defaults` and `overrides`. They start empty.
  - Each other key of the panel of the chart is in the core panel with no change, for example `title`.
- `save.3` The options of the panel of the chart are found key by key, as in `tool.38`: in `options` with the
  `options` list of the chart, and in `fieldConfig.defaults` with the `fieldConfig` list. A carried option is an
  option whose entry has `core`. The core panel gets values in two steps:
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
  `path` of `core`, and it keeps its `value`. An override with no carried property is not in the core panel.
- `save.5` The core panel does not have a dropped option. A dropped option is one of these:
  - An option of the panel of the chart whose entry has no `core`.
  - A path of the panel of the chart that is not an option of the chart, and is not a path of the `options` of
    the chart row (`save.3`).
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
- `save.9` A Grafana of `coreVersion` or of a newer version reads the core panel, because it runs the migrations
  from `coreVersion`. An older Grafana does not know that form, and it ignores an option that it does not know.
  When a save needs the core panel and the version of the Grafana of the save is older than `coreVersion`, the
  save is refused: it writes no panel. It tells the user and the model the version of the Grafana and
  `coreVersion`. The order of two versions is the precedence of Semantic Versioning 2.0.0.
