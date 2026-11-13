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
- `renderer.12` The chart has no data links, because the chart is not in a Grafana dashboard.
- `renderer.13` The Renderer shows no panel editor.
- `renderer.14` The chart shows only the data of the viz spec. Without `onRefresh`, it does not query again. Zoom,
  pan and other controls of the chart stay inside `data.range`.
- `renderer.17` If the viz spec has `panel.title`, the Renderer shows it above the chart, as the panel header of
  Grafana does. It shows the title as text, not as HTML. If the title is wider than `el`, the Renderer cuts it with
  `…` and shows the full title on hover. The title and the chart together fill `el` (`renderer.10`). With no
  `panel.title`, the Renderer shows no title.

## Ad-hoc filters

- `renderer.18` The tooltip shows the buttons "Filter for value" and "Filter out value", as the tooltip of Grafana
  does, only when the App gives `onRefresh` and the viz spec has `filters`. It shows them for each label of the
  series of the tooltip, and for the value of each field that has `config.filterable` set to true. The `key` is the
  name of the label or of the field. The `value` is the value of the label or of the field, as text. The tooltip
  shows no button for an ad-hoc filter that is already in `filters`.
- `renderer.19` The Renderer shows each ad-hoc filter of `filters` above the chart, in the order of the list: the
  `key`, the `operator` and the `value`. It shows them as text, not as HTML. Thus the user sees that the chart does
  not show all the data of the query. With `onRefresh`, each ad-hoc filter has a remove button. The title, the
  ad-hoc filters and the chart together fill `el` (`renderer.10`). With no `filters`, or with an empty list, the
  Renderer shows no ad-hoc filter.
