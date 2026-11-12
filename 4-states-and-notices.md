# 4. States and notices

The Renderer tells the App what it shows: a state, an error, and notices. The App tells the model when the chart
is not what the model expects.

Lists: `registry/states.json` gives the states, the error codes and their message patterns.
`registry/notices.json` gives the notice codes and their message patterns. A name in angle brackets is a
placeholder.

## The state

- `state.1` The Renderer sets the attribute `data-viz-state` on `el`. The value is `rendering` until the first draw
  is complete. Then it is a final state: `ready`, `no-data` or `error`. Tests wait for this attribute. They do not
  look at pixels to know that the draw is complete.
- `state.2` For the `error` state, the Renderer also sets `data-viz-error` to the error code.
- `state.3` The Renderer checks the viz spec in the order of the `errors` list of `states.json`, from
  `invalid-spec` to `all-queries-failed`. The first error that matches gives the state.
- `state.4` If no check of `state.3` matches, and no frame has a row, the state is `no-data`. Otherwise the state is
  `ready`.
- `state.5` `panel-error` and `render-error` occur during the draw. Each one replaces the state that matched
  before it.
- `state.6` The message of an error is made from its pattern. For `render-error`, `<panelName>` is the `name` of the
  panel row in `panel-types.json`. The Renderer does not show the raw message of the error. It writes the raw
  message to `console.error`.
- `state.18` For `all-queries-failed`, the message has one line for each entry of `data.results`, in the order of
  `panel.targets`. The lines are joined with a line break.

## Notices

- `state.7` In the states `ready` and `no-data`, and with `panel-error`, the Renderer shows the notices of
  `notices.json` that have `raisedBy` `renderer` and whose condition is true. Then it shows the notices of the
  `notices` field of the viz spec.
- `state.8` `query-failed`: one notice for each entry of `data.results` that has an `error`, when another entry
  has no error. If every entry has an `error`, the state is `error` (`state.3`) and these notices do not show.
- `state.9` `unit-unknown`: `panel.fieldConfig.defaults.unit` is not a unit ID of `@grafana/data`. The values show
  with no unit.
- `state.19` `series-truncated`: the frames have more series than `maxSeries`. The Renderer draws the first
  `maxSeries` series, in the order of the frames and of the fields in each frame. It does not sort the series. The
  query sets the order, for example with `topk` or `sort`. `<omitted>` is the number of series that it does not
  draw. `<maxSeries>` is the value of `maxSeries`.
- `state.11` `geo-map-tiles` and `geo-offline-file`: a map layer of the geo panel needs the network. The Renderer
  draws the layer with no network, or it leaves the layer out.

## The onState hook

- `state.12` The Renderer calls `onState` after it sets `data-viz-state` to a final state, and each time the state,
  the error or the notices change. It does not call `onState` for `rendering`. A second draw with the same state,
  error and notices, for example after a resize, does not call it.
- `state.13` If `onState` throws, the Renderer writes the error to `console.error` with the prefix `grafana-viz:`.
  The chart, the state and the notices do not change. `render` and `update` can call `onState` before they return.

## Model context

- `state.14` The App sends model context with `updateModelContext` of MCP Apps in each of these cases:
  - The final state is not `ready`.
  - The chart shows one or more notices.
  - A refresh with the cause `timeRange` completes (`refresh.9`).
  - The user switches to an alternative chart (`spec.2`).
- `state.15` The model context is one text item. It names the chart, the time range of the tool arguments and the
  absolute range of `data.range`, the state, the error message if there is one, and the message of each notice.
- `state.16` The App does not send model context for a first draw that is `ready` with no notices. The chart is
  then what the model asked for.
- `state.17` The Host uses the model context in a later turn, not in the turn of the tool call. A new model context
  replaces the one before it.
