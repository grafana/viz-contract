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

- `delivery.14` The Renderer build writes `chart-options.json` next to the manifest. Shape:
  `schemas/chart-options.schema.json`. The file has one entry for each row of `registry/chart-types.json`. The
  `options` list of an entry has each panel option that the panel of the row reads when its options are the
  `options` of the row. The `fieldConfig` list has each field option that this panel reads. The order of a list is
  the order in which a user reads the options.
- `delivery.15` The file leaves out these options:
  - An option whose path is in the `options` of the chart row. The `type` argument sets it.
  - An option that only a panel editor reads.
  - An option that the Renderer does not apply, for example data links (`renderer.12`).

  No path of a list is the start of another path of the same list.
- `delivery.16` The `schema` of an option accepts each value that the Renderer applies, and no other value. The
  `description` says what the option changes in the chart. The Renderer decides the `tier`.

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
  - With the time picker open.
  - With a legend menu open, and with the zoom controls shown.

  The check finds only the icons of these states. An icon of a state that the check does not draw can still make a
  request.
- `delivery.10` A CI check makes sure that `app.html` has one copy of `react-inlinesvg`. With two copies, the App can
  fill a cache that `Icon` does not read.
- `delivery.11` A CI check reports the gzip size of `icons.json`, and does not fail. `icons.json` adds to the size
  of `app.html`, but `maxBundleGzipBytes` (`delivery.5`) is for the Renderer bundle only, and does not include
  `icons.json`.
- `delivery.17` A CI check of the Renderer makes sure that `chart-options.json` is complete. It fails when a panel
  has an option that is not in the file and that `delivery.15` does not leave out. Thus each new option needs a
  `schema` before it ships, also an option with a custom editor.
- `delivery.18` A CI check of the Renderer makes sure that `chart-options.json` validates against its schema, that
  each `default` validates against the `schema` of its option, and that the file follows `delivery.15`.
