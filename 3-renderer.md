# 3. The Renderer

The App imports the Renderer and calls it to draw a viz spec into an element.

Shape: `renderer-api.d.ts`.

## The API

- `renderer.1` The Renderer is an ES module. It exports `version`, `specVersions` and `render`.
- `renderer.2` `render(el, spec, options)` returns a handle at once. The draw continues after the return. The App
  waits for `onState`, or for `data-viz-state` to leave `rendering` (`state.1`).
- `renderer.3` `render` throws only if `el` is not an `HTMLElement`. If the spec is not correct, `render` shows the
  error state (`state.3`). It also writes the error to `console.error` with the prefix `grafana-viz:`.
- `renderer.4` `update(spec)` draws a new viz spec into the same element.
- `renderer.5` `destroy()` removes the chart and its listeners. After `destroy`, a call of `update` or
  `setRefreshed` does nothing.

## The page

- `renderer.6` The Renderer works in an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`, under the
  default content security policy of MCP Apps. The App adds nothing for it.
- `renderer.7` The Renderer makes no network request. It loads no script, font, map tile or file from the network.
- `renderer.8` If the browser blocks `localStorage`, the Renderer still works.
- `renderer.9` The Renderer takes React, `@grafana/ui`, `@grafana/data` and `@emotion/*` from the App. The
  `peerDependencies` in the `package.json` of the Renderer list them. The Renderer bundle has no copy of them.
- `renderer.15` This is a rule for the App. Before the App calls `render`, it fills the icon cache with each icon
  of `icons.json` (`delivery.9`). Thus the `Icon` of `@grafana/ui` makes no network request (`renderer.7`). The
  Renderer cannot fill the icon cache, because the icon cache is in the copy of `@grafana/ui` of the App
  (`renderer.9`). The fill of the icon cache does not change the sandbox or the content security policy of
  `renderer.6`.
- `renderer.16` This is a rule for the App. The key of each icon cache entry is the URL that `Icon` of the
  `@grafana/ui` of the App requests for the icon. If a key is not correct, `Icon` does not find the entry and makes
  a request. The check of `delivery.7` finds this request.

## The chart

- `renderer.10` The chart fills the width and the height of `el`. If the height of `el` is 0, the Renderer sets it
  to `defaultHeightPx`.
- `renderer.11` The Renderer uses the Grafana theme of `theme`.
- `renderer.12` The chart has no data links and no ad-hoc filter buttons, because the chart is not in a Grafana
  dashboard.
- `renderer.13` The Renderer shows no panel editor.
- `renderer.14` The chart shows only the data of the viz spec. Without `onRefresh`, it does not query again. Zoom,
  pan and other controls of the chart stay inside `data.range`.
- `renderer.17` If the viz spec has `panel.title`, the Renderer shows it above the chart, as the panel header of
  Grafana does. It shows the title as text, not as HTML. If the title is wider than `el`, the Renderer cuts it with
  `…` and shows the full title on hover. The title and the chart together fill `el` (`renderer.10`). With no
  `panel.title`, the Renderer shows no title.

## The legend

The user can click an item of the legend to hide or show it, and pick a new color for it. These actions make the
legend overrides: the hide override and the legend colors.

- `renderer.34` The Renderer gives the panel `onFieldConfigChange(config, replace)` in `PanelProps`, as `VizPanel`
  of `@grafana/scenes` does. With `replace` true, `config` is the whole new `fieldConfig`. With no `replace`, the
  Renderer merges `config` into the current `fieldConfig`, as `VizPanel` does. The panel calls
  `onFieldConfigChange` for each legend action. The panel gives its legend its own `onToggleSeriesVisibility` and
  `onSeriesColorChange` in `PanelContext`, so the Renderer does not give them.
- `renderer.35` The legend has the actions of Grafana:
  - A click on an item shows only that item. A second click on the same item shows all items again.
  - For `piechart`, `funnel`, `candlestick`, `boxplot`, `nodeGraph`, `sankey` and `chord`, a click hides or shows
    only that item. The legend items of these charts are slices, series or nodes, not one field each.
  - A click with Ctrl, Cmd or Shift hides or shows only that item. The other items do not change.
  - A pick in the color picker of an item gives that item the new color.

  A panel with no legend has no legend actions.
- `renderer.36` The legend overrides have the shapes of Grafana:
  - The hide override is the one override with the `__systemRef` `hideSeriesFrom`. Its `byNames` matcher has the
    mode `exclude` and lists the names of the items that show. Thus each item that is not in the list is hidden.
  - A legend color is an override with the `byName` matcher on the name of one item, and the property `color`
    with the mode `fixed`.
- `renderer.37` After a call of `onFieldConfigChange`, the Renderer compares the new `fieldConfig` with the
  `fieldConfig` that the panel had. It finds the legend overrides in the difference:
  - If the `hideSeriesFrom` override is new, changed or removed, that is the new hide override, or no hide
    override.
  - Each `byName` color that is new or changed is the new legend color of that name.

  The Renderer keeps each legend color as its own override, apart from the overrides of the viz spec. The
  overrides of the viz spec do not change. This differs from Grafana, where a color pick can change an override
  of the panel. Then the Renderer draws again with the overrides of `renderer.38`. The state and the notices do not
  change, so the Renderer does not call `onState` (`state.12`).
- `renderer.38` The Renderer keeps the legend overrides until `destroy`. Each draw gives the panel the overrides
  of the viz spec, then the legend overrides:
  - The hide override replaces a `hideSeriesFrom` override of the viz spec.
  - For an item with a legend color, the Renderer removes the `color` property from each `byName` override of the
    viz spec for that name. Some charts read the first color override of a name, and Grafana reads the last one.
    Thus the legend color wins in each chart.

  Thus the legend overrides stay after each `update`, for example after a refresh (`refresh.12`), a new theme
  (`spec.5`) or a new time zone (`spec.6`).
- `renderer.39` A legend override finds an item by its name in the legend. For a chart whose items are fields,
  the name is the display name that `getFieldDisplayName` of `@grafana/data` gives. For the charts of the second
  action of `renderer.35`, it is the name of the slice, the series or the node. For example, the user hides B of
  the series A and B, and a refresh adds the series C. If the names A and B do not change, only A shows. The
  Renderer keeps the names that are not in the new data. If such an item comes back in a later `update`, the
  override applies to it again. A display name can change with the data, as in Grafana. For example, if all
  series have one label, the display name is the label value. If a refresh adds a second label, each display name
  changes, and the legend overrides do not find the series.
- `renderer.40` If the hide override hides each item of a draw, the Renderer draws with no hide override. It
  keeps the hide override for the next draws. For example, the user shows only A, and a refresh gives no A. Then
  all series show. If a later refresh brings A back, only A shows again. Also, a Ctrl click on the last item that
  shows makes all items show. This differs from Grafana, where the chart then shows no item.
- `renderer.41` Only the Renderer has the legend overrides. It does not give them to the App, so the model does
  not get them. They are not in the tool arguments, so a refresh does not send them to the Source (`refresh.9`).
  The Renderer keeps them in memory only, not in `localStorage` (`renderer.8`). A new `render` starts with no
  legend overrides.
