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
- `renderer.17` If the viz spec has `panel.title`, the Renderer shows it above the chart, as the panel header of
  Grafana does. It shows the title as text, not as HTML. If the title is wider than `el`, the Renderer cuts it with
  `…` and shows the full title on hover. The title and the chart together fill `el` (`renderer.10`). With no
  `panel.title`, the Renderer shows no title.

## The legend

The user can hide, show and color the items of the legend, as in a Grafana panel. The panel decides what each
action does on its chart. These rules give only what the App and the user see after an `update`.

- `renderer.34` A legend action changes the legend overrides: the `fieldConfig` overrides that the user makes with
  the legend. The Renderer draws with them. A legend action does not change the viz spec of the App. The state and
  the notices do not change, so the Renderer does not call `onState` (`state.12`).
- `renderer.35` The Renderer keeps the legend overrides until `destroy`. At each `update`, it draws the new viz
  spec with the legend overrides. A legend override wins over an override of the viz spec. Thus the legend
  overrides stay after each `update`, for example after a refresh (`refresh.12`), a new theme (`spec.5`) or a new
  time zone (`spec.6`).
- `renderer.36` A legend override finds an item by the name that the legend shows for it. For example, for a chart
  whose items are fields, the name is the display name that `getFieldDisplayName` of `@grafana/data` gives. If an
  item gets a new name in the new data, the legend overrides take it as a new item. For example, a refresh that
  adds a label to each series can change each display name, as in Grafana. The Renderer keeps the change for a
  name that is not in the new data. If that item comes back in a later `update`, the change applies to it again.
  Thus the chart can be empty, as in a Grafana panel. For example, the user shows only A, and a refresh gives no
  A. Then the chart shows no series until A comes back or the user changes the legend.
- `renderer.37` Only the Renderer has the legend overrides. It does not give them to the App, so the model does
  not get them. They are not in the tool arguments, so a refresh does not send them to the Source (`refresh.9`).
  The Renderer keeps them in memory only, not in `localStorage` (`renderer.8`). A new `render` starts with no
  legend overrides.

## Zoom and pan

A zoom is a drag across the plot area that selects a part of the time range. A zoom out shows a wider time
range. Reset goes back to the reset range of `renderer.45`. A pan is a drag that moves the time range.

- `renderer.42` Without `onRefresh`, the chart shows only the data of the viz spec, and the Renderer does not
  query again. Zoom, zoom out, Reset and pan work in the Renderer only, on that data. They stay inside
  `data.range`. Reset shows all of `data.range`.
- `renderer.43` With `onRefresh`, each zoom, zoom out, Reset and pan calls `onRefresh` one time with the cause
  `timeRange` and the `from` and `to` of the new time range. Thus it changes the time range as a pick of the time
  picker does (`refresh.3`). After the call, the chart is busy, as for each refresh (`refresh.4`, `refresh.5`). For
  zoom, zoom out and pan, `from` and `to` are epoch milliseconds as decimal strings, for example `"1790352577294"`.
- `renderer.44` A double click on the plot area and the Zoom out button of the time picker each do one zoom out. A
  zoom out keeps the center of the time range and makes it wider, as Grafana does. Without `onRefresh`, it stays
  inside `data.range` (`renderer.42`).
- `renderer.45` The Renderer keeps a reset range. At `render`, the reset range is the `timeRange` of the viz spec
  (`spec.17`). If the viz spec has no `timeRange`, the reset range is its `data.range`. Each pick of the time
  picker sets the reset range to the pick. A zoom, a zoom out, a pan, a Reset and a call of `update` do not change
  it. For example, after a pick A, a zoom, a pick B and a zoom, the reset range is B. With `onRefresh`, Reset
  calls `onRefresh` with the `from` and `to` of the reset range. A relative range stays relative. Thus later
  refreshes move with the clock (`refresh.3`). The Renderer sends an integer as its decimal string, as the Source
  does (`tool.6`). For example, `1790352577294` becomes `"1790352577294"`.
- `renderer.48` If no zoom, zoom out or pan came after the last change of the reset range or after the last
  Reset, Reset does nothing. Thus Reset sends no query for the time range that the chart already asked for.
- `renderer.46` A pan calls `onRefresh` only at the end of the drag. It does not call `onRefresh` while the drag
  continues, because data source requests can be slow or expensive.
- `renderer.47` While the chart is busy, zoom, zoom out, Reset and pan do nothing.
