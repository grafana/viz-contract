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

## Add an annotation

The user can add an annotation to a chart with a time axis. The App saves it. The annotation query and the annotation
frames are in `2-viz-spec.md` (`spec.12`).

Shape: `onAnnotate`, `AnnotateRequest` and `setAnnotated` in `renderer-api.d.ts`.

### Open the form

- `renderer.49` The Renderer shows the Add annotation UI only if the App gives `onAnnotate` and the chart has a time
  axis. The Add annotation UI is the Add annotation button of the pinned tooltip (`renderer.66`), the Ctrl or Cmd
  gestures (`renderer.50`) and the form. Without `onAnnotate`, the Renderer shows no Add annotation UI. The App
  gives the same `onAnnotate` for each chart. It does not need to know which charts have a time axis.
- `renderer.66` A pinned tooltip has an Add annotation button, as the pinned tooltip of Grafana has. A click on the
  button closes the tooltip and opens the form at the time of the tooltip. Thus the user can see that the chart
  can add an annotation, and a user with no keyboard can add a point annotation. A range needs the drag of
  `renderer.50`.
- `renderer.50` The user also opens the form with Ctrl or Cmd held down: a click on the plot area opens it at the
  time of the click, and a drag across the plot area opens it for the time range of the drag. The form has a text
  field, a tags field, a Save button and a Cancel button.
- `renderer.51` A click or a drag with no Ctrl and no Cmd does not open the form. It keeps its other meaning, for
  example the pinned tooltip or a zoom. Thus a gesture has one meaning when the App gives both `onRefresh` and
  `onAnnotate`. Grafana uses the same keys (the `click` handler and `maybeZoomAction` in
  [TooltipPlugin2.tsx](https://github.com/grafana/grafana/blob/main/packages/grafana-ui/src/components/uPlot/plugins/TooltipPlugin2.tsx)).
- `renderer.52` The Renderer shows one form at most. If the form is open and not busy, a new Ctrl or Cmd click or
  drag, or a click on the Add annotation button, moves the form to the new point or range. The form keeps its
  text, its tags and its message. If the form is busy, these actions do not change the form.
- `renderer.53` The user closes the form with Cancel or the Escape key. The Renderer does not call `onAnnotate`. If
  the form is busy, Cancel and the Escape key do nothing. The busy state ends after `annotateTimeoutMs` at the
  latest (`renderer.56`).

### Save the form

- `renderer.54` When the user saves the form, the Renderer calls `onAnnotate` with a new `id`, the `time` of the
  point or the start of the range, the `timeEnd` of the end of a range, the `text` and the `tags`. `time` and
  `timeEnd` are epoch milliseconds. A point has no `timeEnd`. The Renderer removes the white space at the start
  and the end of `text` and of each tag, and it leaves out each tag that is then empty. The Renderer does not call
  `onAnnotate` if `text` is then empty. This contract gives no length limit for `text` and `tags`. If the App
  cannot save them, it answers with `setAnnotated(id, false, error)`.
- `renderer.55` After the call of `onAnnotate`, the form is busy and the user cannot save it again. The chart stays.
- `renderer.56` The busy state ends at the first of these events:
  - The App calls `setAnnotated(id, true)`. The Renderer closes the form and shows the annotation on the chart.
  - The App calls `setAnnotated(id, false, error)`. The form stays open with its text and its tags. The Renderer
    shows the `annotate-failed` message of `states.json`. With no `error`, it shows `annotate-failed-no-detail`.
  - `annotateTimeoutMs` passes with no result. The form stays open with its text and its tags. The Renderer shows
    `annotate-timeout`. The App can still save the annotation after this time (`renderer.58`), so the message
    tells the user that a second save can make a second annotation.
- `renderer.57` Only the result of the last `onAnnotate` call changes the form. A call of `setAnnotated` with an
  `id` that is not the `id` of the last `AnnotateRequest` does not change the form, its busy state or its message.
  A call before the first `onAnnotate` and a second call for the same `AnnotateRequest` do nothing.
- `renderer.58` A late result is a result that comes after `annotateTimeoutMs`, or a result of an
  `AnnotateRequest` that is not the last one. The Renderer handles a late result in one of these ways:
  - A late `setAnnotated(id, true)` shows the annotation of that `AnnotateRequest` on the chart, with the `time`,
    the `timeEnd`, the `text` and the `tags` of the request. Thus the chart shows each annotation that the App
    saved, also if the user saved the form two times.
  - A late `setAnnotated(id, true)` closes the form only if all of these conditions are true: the `id` is the
    `id` of the last `AnnotateRequest`, the form is open, and its point or range, its text and its tags are those
    of the request. If the user changed the form or opened a new form after the timeout, the form stays open with
    its text and its tags, and the `annotate-timeout` message goes away. With no form open, the Renderer only
    shows the annotation.
  - A late `setAnnotated(id, false, error)` does nothing, because the user already saw `annotate-timeout`.
- `renderer.59` If `onAnnotate` throws, the Renderer writes the error to `console.error` with the prefix
  `grafana-viz:`. The busy state ends as with `setAnnotated(<id>, false, <error message>)`.
- `renderer.60` The Renderer shows the `annotate-failed`, `annotate-failed-no-detail` and `annotate-timeout`
  messages in the form. A message goes away when the form closes, and when the user saves the form again.

### Update and destroy

- `renderer.61` `update` does not close the form. The form keeps its point or range, its text, its tags, its busy
  state and its message. A later `setAnnotated` applies as before the `update`. If the point or the range of the
  form is not in the time range of the new chart, the form stays open at the nearest edge of the plot area, and a
  save still gives the `time` and the `timeEnd` of the form. If the chart of the new viz spec has no time axis,
  the Renderer closes the form.
- `renderer.67` The busy state of the form and the busy state of a refresh (`refresh.4`) are independent. While
  the chart is busy with a refresh, the user can open, move, save and close the form. While the form is busy,
  Refresh, the time picker, zoom and pan work as before.
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
- `renderer.48` With `onRefresh`, Reset does nothing while the chart shows the reset range. The chart shows the
  reset range after `render`. It also shows it after an `update` that ends the busy state of a pick of the time
  picker or of a Reset (`refresh.5`), or that comes after the timeout of that pick or Reset (`refresh.15`). The
  chart stops showing the reset range when a zoom, a zoom out or a pan calls `onRefresh`. This is also true if
  that refresh fails, because the App keeps the new range (`refresh.9`). A pick or a Reset whose refresh fails or
  times out does not show the reset range. Thus the user can try Reset again.
- `renderer.46` A pan calls `onRefresh` only at the end of the drag. It does not call `onRefresh` while the drag
  continues, because data source requests can be slow or expensive.
- `renderer.47` While the chart is busy, zoom, zoom out, Reset and pan do nothing.
