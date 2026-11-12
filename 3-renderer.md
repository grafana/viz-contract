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

The user can click a series in the legend to hide or show it, and pick a new color for it. The overrides that
these actions make are the legend overrides.

- `renderer.18` The Renderer gives the panel a `PanelContext` with `onToggleSeriesVisibility` and
  `onSeriesColorChange`, as `VizPanel` of `@grafana/scenes` does. Thus the legend has the actions of Grafana:
  - A click on a series shows only that series. A second click on the same series shows all series again.
  - A click with Ctrl, or with Cmd on macOS, hides or shows only that series. The other series do not change.
  - A pick in the color picker of a series gives that series the new color.

  A panel with no legend has no legend actions.
- `renderer.19` An action changes `panel.fieldConfig.overrides` of the viz spec that the Renderer draws. The
  Renderer makes the change with `seriesVisibilityConfigFactory` and `changeSeriesColorConfigFactory` of
  `@grafana/scenes`, as Grafana does:
  - Hide and show change the hide override: the one override with the `__systemRef` `hideSeriesFrom`. Its
    `byNames` matcher lists the display names of the series that show.
  - A color pick gives an override with the `byName` matcher on the display name of the series, and the property
    `color` with the mode `fixed`.

  The chart draws again with the change. The state and the notices do not change, so the Renderer does not call
  `onState` (`state.12`).
- `renderer.20` The Renderer keeps the legend overrides until `destroy`. At each `update`, it adds them after the
  overrides of the new viz spec. Thus the legend overrides stay after a refresh (`refresh.12`), a new time range
  and a new theme (`spec.5`). The hide override replaces a `hideSeriesFrom` override of the new viz spec. A
  color override of the legend wins over a color override of the new viz spec, because a later override wins in
  Grafana.
- `renderer.21` A legend override finds a series by its display name, as `getFieldDisplayName` of `@grafana/data`
  gives it. Thus a series of the new data with the same display name gets the old change. A series with a new
  display name gets no change. The Renderer keeps the names that are not in the new data. If such a series comes
  back in a later `update`, the change applies to it again.
- `renderer.22` If the hide override hides each series that the Renderer draws, the Renderer removes the hide
  override and shows all series. For example, the user shows only one series, and a refresh gives data with no
  series of that display name.
- `renderer.23` Only the Renderer has the legend overrides. It does not give them to the App, so the model does
  not get them. They are not in the tool arguments, so a refresh does not send them to the Source (`refresh.9`).
  The Renderer keeps them in memory only, not in `localStorage` (`renderer.8`). A new `render` starts with no
  legend overrides.
