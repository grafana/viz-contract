# Changelog

Each version of the contract has one entry. [8-versioning.md](8-versioning.md) gives the version rules. An entry
marked `internal` changes only an interface with the internal or the provisional promise.

## 1.1.0 (internal)

- New rule `renderer.15`: before the App calls `render`, it fills the `react-inlinesvg` cache of its `@grafana/ui`
  with the icons that the Renderer can show. Thus the icons load with no network request under the default MCP Apps
  content security policy.
- New manifest field `icons` (`delivery.2`): the names of the `@grafana/ui` icons that the Renderer can show.
- New rule `delivery.7`: a CI check of the icon cache of the App.

## 1.0.0

- First version.
