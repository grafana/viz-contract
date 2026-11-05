# Changelog

Each version of the contract has one entry. [8-versioning.md](8-versioning.md) gives the version rules. An entry
marked `internal` changes only an interface with the internal or the provisional promise.

## 1.2.0

`internal`

- New rule `renderer.15`: before the App calls `render`, it fills the `react-inlinesvg` cache of its `@grafana/ui`
  with the icons that the Renderer can show. Thus the icons load with no network request under the default MCP Apps
  content security policy.
- New manifest field `icons` (`delivery.2`): the names of the `@grafana/ui` icons that the Renderer can show.
- New rule `delivery.7`: a CI check of the icon cache of the App.

## 1.1.0

`internal`

- `render_grafana_app` adds the notes of the Source after its text line (`tool.28`, `tool.30`). New constants
  `maxAppNotes` and `maxAppNoteChars`. `tool.26` is removed.
- The Source gives one note for each entry of `data.results` that has an `error` (`tool.29`).
- `future.md` loses item 1, failures in the text result.

## 1.0.0

- First version.
