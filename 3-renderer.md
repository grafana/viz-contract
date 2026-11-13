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

## Add an annotation

The user can add an annotation to a chart with a time axis. The App saves it. The annotation query and the annotation
frames are in `2-viz-spec.md` (`spec.12`).

Shape: `onAnnotate`, `AnnotateRequest` and `setAnnotated` in `renderer-api.d.ts`.

- `renderer.18` The Renderer shows the Add annotation UI only if the App gives `onAnnotate` and the chart has a time
  axis. Without `onAnnotate`, the Renderer shows no Add annotation UI.
- `renderer.19` The user adds an annotation in one of two ways: a click on a point of the time axis, or a drag over
  a range of it. The Renderer then shows a form with a text field and a tags field.
- `renderer.20` When the user saves the form, the Renderer calls `onAnnotate` with a new `id`, the `time` of the
  point or the start of the range, the `timeEnd` of the end of a range, the `text` and the `tags`. `time` and
  `timeEnd` are epoch milliseconds. A point has no `timeEnd`. The Renderer does not call `onAnnotate` if `text` is
  empty.
- `renderer.21` After the call of `onAnnotate`, the form is busy and the user cannot save it again. The chart stays.
- `renderer.22` The busy state ends at the first of these events:
  - The App calls `setAnnotated(id, true)`. The Renderer closes the form and shows the annotation on the chart.
  - The App calls `setAnnotated(id, false, error)`. The form stays open with its text. The Renderer shows the
    `annotate-failed` message of `states.json`. With no `error`, it shows `annotate-failed-no-detail`.
  - `refreshTimeoutMs` passes with no result. The Renderer shows `annotate-timeout`.
- `renderer.23` `setAnnotated` gives the result of the last `onAnnotate` call only. A call with an `id` that is not
  the `id` of the last `AnnotateRequest`, a call before the first `onAnnotate`, a second call for the same
  annotation, and a call after the timeout do nothing.
- `renderer.24` If `onAnnotate` throws, the Renderer writes the error to `console.error` with the prefix
  `grafana-viz:`. The busy state ends as with `setAnnotated(<id>, false, <error message>)`.
- `renderer.25` This is a rule for the App. The App gives `onAnnotate` only if it can save an annotation. If it has
  no way to save, it does not give `onAnnotate`, and `renderer.18` applies. How the App saves is not in this
  contract.
- `renderer.26` After `setAnnotated(<id>, true)`, the App can call `update` with a viz spec that has the new
  annotation in `data.annotations`. If it does not, the Renderer keeps the new annotation on the chart until the next
  `update`.
