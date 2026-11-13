/**
 * The Renderer API. The App imports the Renderer as an ES module. 3-renderer.md, 4-states-and-notices.md and
 * 5-refresh.md give the rules.
 *
 * This file has types only. The package has no JavaScript. Import it with `import type`. The values that it
 * declares, for example render, come from the Renderer.
 *
 * The Renderer takes React and the Grafana packages from the App. The peerDependencies of the Renderer give
 * them.
 */

/** Semver of the Renderer. */
export declare const version: string;

/** The specVersion values that the Renderer supports. */
export declare const specVersions: readonly number[];

/**
 * Draws a viz spec into el, and returns at once. A spec that is not correct gives the error state. It does not
 * throw. render throws only if el is not an HTMLElement.
 */
export declare function render(el: HTMLElement, spec: unknown, options?: RenderOptions): RenderHandle;

export interface RenderOptions {
  /** Called when the Renderer shows a new final state or new notices. */
  onState?: (state: RenderState) => void;
  /**
   * Called when the user clicks Refresh or picks a time range. The Renderer shows Refresh and the time picker
   * only when the App gives this option.
   */
  onRefresh?: (request: RefreshRequest) => void;
  /**
   * Called when the user clicks the Ask in chat link of the tooltip. The Renderer shows the link only when the App
   * gives this option.
   */
  onMessage?: (request: MessageRequest) => void;
}

export interface RenderHandle {
  /** Draws a new viz spec in the same element. */
  update(spec: unknown): void;
  /**
   * Gives the result of the refresh with this id. id is the id of the RefreshRequest. With ok false, error is the
   * text that the Renderer shows.
   */
  setRefreshed(id: string, ok: boolean, error?: string): void;
  /** Removes the chart and its listeners. */
  destroy(): void;
}

/** A final state. The value is the same as the data-viz-state attribute of el. */
export interface RenderState {
  state: 'ready' | 'no-data' | 'error';
  /** Present only when state is error. */
  error?: RenderError;
  /** The notices that the chart shows, in the same order. Can be empty. */
  notices: Notice[];
}

export interface RenderError {
  /** A code of errors in registry/states.json. */
  code: string;
  /** The message, made from the pattern of the code. */
  message: string;
}

export interface Notice {
  /** A code of registry/notices.json. */
  code: string;
  /** The message, made from the pattern of the code. */
  message: string;
}

/**
 * A refresh. id is a new value for each call of onRefresh. The App gives it to setRefreshed. For timeRange, from
 * and to are the range that the user picked. A relative range, for example now-6h to now, stays relative. An
 * absolute range is in epoch milliseconds.
 */
export type RefreshRequest = { id: string } & (
  | { cause: 'refresh' }
  | { cause: 'timeRange'; from: string; to: string }
);

/**
 * A message about a part of the chart, for the conversation. The App makes the text. A later version can add a
 * target, for example a range.
 */
export interface MessageRequest {
  target: 'point';
  series: SeriesRef;
  point: PointRef;
}

export interface SeriesRef {
  /** The display name, as the tooltip shows it. */
  name: string;
  /** The labels of the field. Can be empty. */
  labels: Record<string, string>;
  /** The refId of the frame. Absent when the frame has none. */
  refId?: string;
}

export interface PointRef {
  /** x as the tooltip shows it, for example a time in timeZone. */
  x: string;
  /** y as the tooltip shows it, with the unit. */
  y: string;
  /** The type of the x field. string is each type that is not a time or a number, for example a category. */
  xType: 'time' | 'number' | 'string';
  /** x in ISO 8601 UTC, for example 2026-11-13T10:00:00.000Z. Present only when xType is time. */
  xIso?: string;
  /** x as a number, for example epoch milliseconds. Absent when x is not a number. */
  xRaw?: number;
  /** y as a number. Absent when y is not a number. */
  yRaw?: number;
}
