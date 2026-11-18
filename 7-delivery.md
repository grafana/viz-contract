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
  other entry. A registered option is an option that a panel gives to the options builder of Grafana, with
  `setPanelOptions` or `useFieldConfig` of `PanelPlugin`. The `options` list of an entry has each registered panel
  option that the builder shows when the options of the panel are the `options` of the row. The `fieldConfig` list
  has each registered field option of this panel. The order of a list is the order in which a user reads the
  options.
- `delivery.17` The file leaves out these options:
  - An option whose path is in the `options` of the chart row. The `type` argument sets it.
  - An option that only a panel editor reads.
  - An option that the Renderer does not apply, for example data links (`renderer.12`).
  - An option that a panel reads but does not register. The check of `delivery.19` cannot find it, and the model
    cannot set it (`tool.39`). It becomes a chart option when the panel registers it.

  No path of a list is the start of another path of the same list.
- `delivery.18` The `schema` of an option accepts each value that the Renderer applies, and no other value. The
  `description` says what the option changes in the chart. The Renderer decides the `tier`.
- `delivery.21` The manifest also gives `chartOptionsSha256`: the hash of `chart-options.json`, in the form of
  `sha256`. The mcp-grafana binary has the manifest and the `chart-options.json` of the Renderer that `app.html`
  holds. Thus, with `delivery.6`, the Source can make sure that the file and the bundle come from the same Renderer
  build (`tool.48`).
- `delivery.22` In the `fieldConfig` list, the path of an entry is the id of a registered field option, as it is.
  The file does not list the parts of a field option whose value is an object. Such an option is one entry, with
  a `schema` of the `type` `object`. Grafana finds the option of an override property by its id, and it ignores a
  property whose id is not the id of a registered option. Thus Grafana applies each override property that the
  Source accepts (`tool.37`). In the `options` list, an entry can be a part of a registered panel option, because
  the Source writes each path of `panel.options` as nested objects (`tool.41`).

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
- `delivery.19` A CI check of the Renderer makes sure that `chart-options.json` is complete. The check reads the
  registered options of each panel from the options builder (`delivery.16`). For the options that only a panel
  editor reads and the options that the Renderer does not apply (`delivery.17`), the Renderer keeps a list with
  the reason for each. The check fails in these cases:
  - A registered option that the builder shows for the `options` of the row is not in the file, and `delivery.17`
    does not leave it out. A panel option whose value is an object is in the file when its path is a path of the
    `options` list or the start of one.
  - A path of the `options` list is not the path of a registered panel option of the panel, and is not inside
    one.
  - A path of the `fieldConfig` list is not the id of a registered field option of the panel (`delivery.22`).

  Thus each new registered option needs a `schema` before it ships, also an option with a custom editor. The check
  does not know the parts of a panel option whose value is an object, so the Renderer lists those parts by hand.
- `delivery.20` A CI check of the Renderer makes sure that `chart-options.json` validates against its schema, that
  each `default` validates against the `schema` of its option, and that the file follows `delivery.17`. It also
  makes sure that the file has one entry for each row of `chart-types.json` and no other entry (`delivery.16`), and
  that `chartOptionsSha256` of the manifest is the hash of the file (`delivery.21`).
