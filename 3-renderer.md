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

### Open the form

- `renderer.49` The Renderer shows the Add annotation UI only if the App gives `onAnnotate` and the chart has a time
  axis. Without `onAnnotate`, the Renderer shows no Add annotation UI. The App gives the same `onAnnotate` for each
  chart. It does not need to know which charts have a time axis.
- `renderer.50` The user opens the form with Ctrl or Cmd held down: a click on a point of the time axis, or a drag
  over a range of it. The Renderer then shows a form with a text field, a tags field, a Save button and a Cancel
  button.
- `renderer.51` A click or a drag with no Ctrl and no Cmd does not open the form. It keeps its other meaning, for
  example the pinned tooltip or a zoom. Thus a gesture has one meaning when the App gives both `onRefresh` and
  `onAnnotate`. Grafana uses the same keys (the `click` handler and `maybeZoomAction` in
  [TooltipPlugin2.tsx](https://github.com/grafana/grafana/blob/main/packages/grafana-ui/src/components/uPlot/plugins/TooltipPlugin2.tsx)).
- `renderer.52` The Renderer shows one form at most. If the form is open and not busy, a new Ctrl or Cmd click or
  drag moves the form to the new point or range. The form keeps its text, its tags and its message. If the form is
  busy, a new Ctrl or Cmd click or drag does nothing.
- `renderer.53` The user closes the form with Cancel or the Escape key. The Renderer does not call `onAnnotate`. If
  the form is busy, Cancel and the Escape key do nothing. The busy state ends after `annotateTimeoutMs` at the
  latest (`renderer.56`).

### Save the form

- `renderer.54` When the user saves the form, the Renderer calls `onAnnotate` with a new `id`, the `time` of the
  point or the start of the range, the `timeEnd` of the end of a range, the `text` and the `tags`. `time` and
  `timeEnd` are epoch milliseconds. A point has no `timeEnd`. The Renderer does not call `onAnnotate` if `text` is
  empty.
- `renderer.55` After the call of `onAnnotate`, the form is busy and the user cannot save it again. The chart stays.
- `renderer.56` The busy state ends at the first of these events:
  - The App calls `setAnnotated(id, true)`. The Renderer closes the form and shows the annotation on the chart.
  - The App calls `setAnnotated(id, false, error)`. The form stays open with its text and its tags. The Renderer
    shows the `annotate-failed` message of `states.json`. With no `error`, it shows `annotate-failed-no-detail`.
  - `annotateTimeoutMs` passes with no result. The form stays open with its text and its tags. The Renderer shows
    `annotate-timeout`. The save can still work, so this message tells the user to check before they save again.
- `renderer.57` `setAnnotated` gives the result of the last `onAnnotate` call only. A call with an `id` that is not
  the `id` of the last `AnnotateRequest` does nothing. A call before the first `onAnnotate` and a second call for
  the same annotation also do nothing.
- `renderer.58` A result after `annotateTimeoutMs` is not old if the user did not save again. A late
  `setAnnotated(id, true)` closes the form and shows the annotation on the chart, as in `renderer.56`. A late
  `setAnnotated(id, false, error)` does nothing, because the user already sees `annotate-timeout`.
- `renderer.59` If `onAnnotate` throws, the Renderer writes the error to `console.error` with the prefix
  `grafana-viz:`. The busy state ends as with `setAnnotated(<id>, false, <error message>)`.
- `renderer.60` The Renderer shows the `annotate-failed`, `annotate-failed-no-detail` and `annotate-timeout`
  messages in the form. A message goes away when the form closes, and when the user saves the form again.

### Update and destroy

- `renderer.61` `update` does not close the form. The form keeps its point or range, its text, its tags, its busy
  state and its message. A later `setAnnotated` applies as before the `update`. If the chart of the new viz spec has
  no time axis, the Renderer closes the form.
- `renderer.62` After `destroy`, a call of `setAnnotated` does nothing.

### The saved annotations

- `renderer.63` The saved annotations are the annotations of the `setAnnotated(<id>, true)` calls of a handle. The
  Renderer keeps them until `destroy`. At each `update`, it draws them with the annotations of `data.annotations`.
  Thus a refresh or a new time range does not remove a saved annotation from the chart. The Renderer keeps them in
  memory only, not in `localStorage` (`renderer.8`). A new `render` starts with no saved annotations.
- `renderer.64` This is a rule for the App. The App does not add a saved annotation to `data.annotations`, because
  `data` is a copy of the tool result (`spec.4`). The Renderer already draws it (`renderer.63`).
- `renderer.65` This is a rule for the App. The App gives `onAnnotate` only if it can save an annotation. If it has
  no way to save, it does not give `onAnnotate`, and `renderer.49` applies. How the App saves is not in this
  contract.

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
