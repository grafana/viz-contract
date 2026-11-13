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
  dashboard. The one exception is the Ask in chat link (`renderer.30`), which shows only when the App gives
  `onMessage`.
- `renderer.13` The Renderer shows no panel editor.
- `renderer.14` The chart shows only the data of the viz spec. Without `onRefresh`, it does not query again. Zoom,
  pan and other controls of the chart stay inside `data.range`.
- `renderer.17` If the viz spec has `panel.title`, the Renderer shows it above the chart, as the panel header of
  Grafana does. It shows the title as text, not as HTML. If the title is wider than `el`, the Renderer cuts it with
  `…` and shows the full title on hover. The title and the chart together fill `el` (`renderer.10`). With no
  `panel.title`, the Renderer shows no title.

## The Ask in chat link

The App sends the message to the conversation. `4-states-and-notices.md` gives its rules, from `state.20`.

- `renderer.30` With `onMessage`, the Renderer adds one data link, Ask in chat, to each field for which the tooltip
  of the panel shows data links. In a tooltip with more than one series, the tooltip of Grafana shows the links of
  one series only. The Ask in chat link follows it, so it does not show on each row. The link shows as Grafana
  shows data links, for example in a pinned tooltip. It does not navigate, and it does not use `oneClick`. Thus a
  click on the chart still pins the tooltip. A panel type whose tooltip shows no data links gets no link. Without
  `onMessage`, the chart has no link (`renderer.12`).
- `renderer.31` A click on the link calls `onMessage` with a `MessageRequest`. `target` is `point`. `series` is the
  field of the link: its display name as the tooltip shows it, its labels, and the `refId` of its frame, if the
  frame has one. `point` is the point of that field at the x of the tooltip.
- `renderer.32` `x` and `y` of the point are the text that the tooltip shows. They use the unit and the decimals of
  the field and the `timeZone` of the viz spec (`spec.6`). `xRaw` and `yRaw` are the same values as numbers. A
  value that is not a number has none. `xType` is `time` if the x field is a time field, `number` if it is a number
  field, and `string` for each other type, for example a category. With `time`, `xIso` is x in ISO 8601 in UTC, in
  the form `YYYY-MM-DDTHH:mm:ss.sssZ`. With `number` and `string`, the point has no `xIso`.
- `renderer.33` If `onMessage` throws, the Renderer writes the error to `console.error` with the prefix
  `grafana-viz:`, as for `onState` (`state.13`). The chart and the tooltip do not change.
