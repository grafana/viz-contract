# 4. States and notices

The Renderer tells the App what it shows: a state, an error, and notices. The App tells the model when the chart
is not what the model expects.

Lists: `registry/states.json` gives the states, the error codes and their message patterns.
`registry/notices.json` gives the notice codes and their message patterns. `registry/messages.json` gives the
patterns of the messages that the App sends to the conversation. A name in angle brackets is a
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
- `state.9` `unit-unknown`: `getValueFormat` of `@grafana/data` does not know `panel.fieldConfig.defaults.unit`.
  The unit is not a key of `getValueFormatterIndex()`, and it does not start with `prefix:`, `suffix:`, `time:`,
  `si:`, `count:`, `currency:` or `bool:`. The values show with the unit as a suffix. For example, the unit `foo`
  shows `5 foo`.
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

## Messages to the chat

The user can send a point of the chart to the conversation with the Ask in chat link of the tooltip
(`renderer.30`). `registry/messages.json` gives the message patterns.

- `state.20` The App gives `onMessage` to the Renderer, unless the `hostCapabilities` of the Host have `message`
  with no `text`. A Host with no `message` capability can still support `ui/message`, so the App does not wait for
  the capability.
- `state.21` When the Renderer calls `onMessage`, the App sends one message with `ui/message` of MCP Apps. The
  message has the `role` `user` and one text item. The App sends no model context for it, because a new model
  context replaces the one of `state.14` (`state.17`). The text has the values of the point only, not the data of
  the series. The model can query again with the tool arguments.
- `state.22` The text is the pattern of `messages.json` with the code `point-<xType>`, where `<xType>` is the
  `xType` of the point. The placeholders are:
  - `<series>`, `<x>` and `<y>`: `series.name`, `point.x` and `point.y`.
  - `<refId>`: `series.refId`. With no `refId`, it is `null`, with no quotes.
  - `<labels>`: `series.labels`, as one JSON object with no spaces. With no labels, it is `{}`.
  - `<chart>`: `panel.title` of the viz spec. With no title, it is `panel.type`.
  - `<xIso>`: `point.xIso`, with no quotes.
  - `<from>` and `<to>`: `data.range` of the viz spec in ISO 8601 in UTC, in the form `YYYY-MM-DDTHH:mm:ss.sssZ`,
    with no quotes.
- `state.23` The series name, the labels, the title, and sometimes x and y, come from the data source. The model
  reads them as text from the user. So the App changes each of these values before it goes into the text: the
  series name, x, y, the `refId`, the title or the panel type, each label key and each label value. It does these
  steps in order:
  1. It removes each character of the Unicode general categories Cc, Cf, Zl and Zp. These are the control
     characters, for example a line break, and the characters that do not show, for example a zero-width space or
     a character that changes the text direction.
  2. If the value is then longer than `maxMessageValueChars`, the App cuts it to one character less than
     `maxMessageValueChars` and adds `…`.
  3. It writes the value as a JSON string, as `JSON.stringify` does. Thus a quote cannot end the value.

  The App uses only the first `maxMessageLabels` labels, in the order of `series.labels`. It leaves out a label
  whose key, after steps 1 and 2, equals the key of a label before it. All lengths of this section are in Unicode
  code points. These steps lower the risk that a value reads as an instruction. They do not remove it.
- `state.24` The App uses the `point-time` pattern only if `point.xIso` has the form of `renderer.32`. If `xType`
  is `time` and `xIso` is absent or has another form, the App uses the `point-string` pattern.
- `state.25` If the text is longer than `maxMessageChars`, the App removes labels from the end of `<labels>`, one
  at a time, until the text is not longer. If the text with no labels is still longer, the App sends no message.
  It shows a short error in its shell, with no text box.
- `state.26` While a message waits for the answer of the Host, the App ignores each new call of `onMessage`.
- `state.27` The Host decides what it does with the message. It can send it, ask the user first, or put the text
  into the chat box. The App handles the answer of the Host in one of these ways:
  - The Host answers with no error. The App shows nothing. This does not mean that the model read the message.
  - The Host answers with `isError` `true`, or with a JSON-RPC error, for example because it does not know
    `ui/message`. The App shows a short error in its shell. Under the error, it shows the text of the message in a
    text box that the user cannot edit, with the text selected. Thus the user can copy the text into the chat. The
    App does not write to the clipboard. The text box closes when the user clicks Close, and on the next call of
    `onMessage`. The App does not send the message again, and it tells the model nothing.
  - The Host gives no answer before the request times out. The App shows no error, because the Host can still
    have the message. `onMessage` works again.
