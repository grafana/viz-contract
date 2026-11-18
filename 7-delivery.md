# 7. Delivery

The Renderer is in the mcp-grafana binary. The App resource `ui://grafana/app.html` holds the App and the Renderer.

## The bundle

- `delivery.1` The Renderer is one ES module bundle. The App build adds it to `app.html`.
- `delivery.2` A manifest next to the bundle gives `version` (the Renderer version), `sha256` (of the bundle),
  `contractVersion` (the version of this contract) and `specVersions` (the viz spec versions that the Renderer
  supports).
- `delivery.3` The App does not check `specVersion` before it calls `render`. If the `specVersion` of the viz spec is
  not in `specVersions`, the Renderer shows the `unsupported-spec-version` error (`state.3`).
- `delivery.9` The Renderer build writes `icons.json` next to the manifest. It gives the SVG of each `@grafana/ui`
  icon that the Renderer, or a `@grafana/ui` component that the Renderer uses, can show. It is a JSON object. A key
  is `<dir>/<name>`, for example `unicons/sync`. `<dir>` is the folder that `Icon` of `@grafana/ui` uses for the
  icon: `unicons`, `solid`, `mono` or `custom`. The same name can be in two folders. A value is the SVG content of
  the icon. The SVG comes from the build, because the `@grafana/ui` package does not ship each icon.

- `delivery.16` The Renderer build writes `chart-options.json` next to the manifest. Shape:
  `schemas/chart-options.schema.json`. The file has one entry for each row of `registry/chart-types.json`, and no
  other entry. The `options` list of an entry has each panel option that the panel of the row reads when its options are the
  `options` of the row. The `fieldConfig` list has each field option that this panel reads. The order of a list is
  the order in which a user reads the options.
- `delivery.17` The file leaves out these options:
  - An option whose path is in the `options` of the chart row. The `type` argument sets it.
  - An option that only a panel editor reads.
  - An option that the Renderer does not apply, for example data links (`renderer.12`).

  No path of a list is the start of another path of the same list.
- `delivery.18` The `schema` of an option accepts each value that the Renderer applies, and no other value. The
  `description` says what the option changes in the chart. The Renderer decides the `tier`.
- `delivery.21` The manifest also gives `chartOptionsSha256`: the hash of `chart-options.json`, in the form of
  `sha256`. The mcp-grafana binary has the manifest and the `chart-options.json` of the Renderer that `app.html`
  holds. Thus, with `delivery.6`, the Source can make sure that the file and the bundle come from the same Renderer
  build (`tool.48`).

## Checks

- `delivery.4` A CI check makes sure that `app.html` has one copy of React.
- `delivery.5` A CI check makes sure that the gzip size of the Renderer bundle is not larger than
  `maxBundleGzipBytes`. While the constant has no value, the check reports the size and does not fail.
- `delivery.6` A CI check makes sure that the `sha256` of the manifest is the hash of the bundle.
- `delivery.7` A CI check makes sure that the App fills the icon cache with each icon of `icons.json`
  (`renderer.15`). Then the check draws the fixtures in `app.html`, in the states of `delivery.8`. It fails on each
  icon request.
- `delivery.8` A CI check of the Renderer fills the icon cache from `icons.json`, as the App does. Then it draws
  each fixture in the iframe of `renderer.6` in these states. It fails on each icon request.
  - With `onRefresh` and with no `onRefresh`.
  - At a width where the toolbar of `@grafana/ui` shows only icons.
  - With a tooltip open, and with a tooltip pinned.
  - With `onMessage` and a tooltip pinned, so that the Ask in chat link shows (`renderer.30`).
  - With the time picker open.
  - With a legend menu open, and with the zoom controls shown.
  - With `onAnnotate`: with a tooltip pinned, and with the Add annotation form open with a message.

  The check finds only the icons of these states. An icon of a state that the check does not draw can still make a
  request.
- `delivery.10` A CI check makes sure that `app.html` has one copy of `react-inlinesvg`. With two copies, the App can
  fill a cache that `Icon` does not read.
- `delivery.11` A CI check reports the gzip size of `icons.json`, and does not fail. `icons.json` adds to the size
  of `app.html`, but `maxBundleGzipBytes` (`delivery.5`) is for the Renderer bundle only, and does not include
  `icons.json`.
- `delivery.12` A CI check of the Renderer draws the `prometheus-line` fixture. It does each zoom, zoom out
  (a double click on the plot area, and the Zoom out button of the time picker when the chart shows it), Reset
  and pan, with `onRefresh` and with no `onRefresh`. With `onRefresh`, the check acts as the App. It ends each busy
  state with `setRefreshed(<id>, true)`, unless a case below gives another answer. It fails in these cases:
  - With `onRefresh`, an action does not call `onRefresh` one time with the cause `timeRange`, or the chart is not
    busy after the call (`renderer.43`).
  - With `onRefresh`, a zoom out after `render` does not give a range that is wider than `data.range` and has the
    same center (`renderer.44`).
  - With `onRefresh`, Reset after a zoom does not give the `from` and `to` of the `timeRange` of the fixture, for
    example `now-15m` and `now` (`renderer.45`).
  - With `onRefresh`, after a pick of the time picker and a zoom, Reset does not give the `from` and `to` of the
    pick (`renderer.45`).
  - With `onRefresh`, Reset with no zoom, zoom out or pan before it calls `onRefresh` (`renderer.48`).
  - With `onRefresh`, after a zoom and a Reset that the check answers with `setRefreshed(<id>, false)`, a second
    Reset does not call `onRefresh` (`renderer.48`).
  - With `onRefresh`, a pan calls `onRefresh` before the end of the drag, or more than one time (`renderer.46`).
  - While the chart is busy, an action calls `onRefresh` (`renderer.47`).
  - With no `onRefresh`, an action makes a network request, or the time range on screen leaves `data.range`
    (`renderer.42`).
- `delivery.13` A CI check of the App runs the test of `fixtures.15` for each set that has `message.json`. It also
  checks each answer of `state.27` with a Host that the test makes:
  - With `isError` `true`, and with a JSON-RPC error, the text box has exactly the text that the App sent.
  - With no error, the App shows no error and no text box.
  - With no answer in `messageTimeoutMs`, the App shows no error and no text box, and a new call of `onMessage`
    sends a message. The test uses a fake clock, so it does not wait.
  - While the Host has not answered, the App shows that it sends the message, and a second call of `onMessage`
    sends no message.
- `delivery.14` A CI check of the Renderer draws the `prometheus-line` fixture with `onAnnotate`. The check acts as
  the App. It makes `annotateTimeoutMs` pass with a clock of the test. It fails in these cases:
  - The pinned tooltip has no Add annotation button, or a click on the button does not open the form
    (`renderer.66`).
  - A Ctrl or Cmd click or drag does not open the form, or a click or a drag with no Ctrl and no Cmd opens it
    (`renderer.50`, `renderer.51`).
  - A save does not call `onAnnotate` one time with the `time`, the `timeEnd`, the `text` and the `tags` of the
    form, or a save with a `text` of white space only calls it (`renderer.54`).
  - While the form is busy, a save, Cancel or the Escape key changes the form or calls `onAnnotate`
    (`renderer.53`, `renderer.55`).
  - After `setAnnotated(<id>, true)`, the form is open, or the chart does not show the annotation
    (`renderer.56`).
  - After `setAnnotated(<id>, false, <error>)`, `setAnnotated(<id>, false)` and the timeout, the form does not
    show the message of `states.json` for that case, or it loses its text or its tags (`renderer.56`).
  - After the timeout and a change of the text, a late `setAnnotated(<id>, true)` closes the form, or the chart
    does not show the annotation (`renderer.58`).
  - After the timeout and a second save, `setAnnotated(<id>, true)` with the `id` of the first save changes the
    form, or the chart does not show the first annotation (`renderer.57`, `renderer.58`).
  - After an `update`, the chart does not show a saved annotation, or the open form loses its text
    (`renderer.61`, `renderer.63`).
  - While the chart is busy with a refresh, the user cannot open and save the form (`renderer.67`).
  - With no `onAnnotate`, or with the `smoke-histogram` fixture and `onAnnotate`, the pinned tooltip has an Add
    annotation button, or a Ctrl or Cmd click opens the form (`renderer.49`).
- `delivery.15` A CI check of the Renderer runs the test of `fixtures.16` for each set that has `message.json`.
- `delivery.19` A CI check of the Renderer makes sure that `chart-options.json` is complete. It fails when a panel
  has an option that is not in the file and that `delivery.17` does not leave out. Thus each new option needs a
  `schema` before it ships, also an option with a custom editor.
- `delivery.20` A CI check of the Renderer makes sure that `chart-options.json` validates against its schema, that
  each `default` validates against the `schema` of its option, and that the file follows `delivery.17`. It also
  makes sure that the file has one entry for each row of `chart-types.json` and no other entry (`delivery.16`), and
  that `chartOptionsSha256` of the manifest is the hash of the file (`delivery.21`).
