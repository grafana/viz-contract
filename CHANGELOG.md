# Changelog

Each version of the contract has one entry. [8-versioning.md](8-versioning.md) gives the version rules. An entry
marked `internal` changes only an interface with the internal or the provisional promise.

## 1.1.0

`internal`

- `render_grafana_app` adds the notes of the Source after its text line (`tool.28`, `tool.30`). New constants
  `maxAppNotes` and `maxAppNoteChars`. `tool.26` is removed.
- The Source gives one note for each failed query of a partial result (`tool.29`).
- `future.md` loses item 1, failures in the text result.

## 1.0.0

- First version.
