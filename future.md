# Future items

These items are not specified yet. The list is in priority order. An item gets its own rules when it is
specified.

1. A `title` argument. The model gives a title, and the chart shows it.
2. An image on demand. The App or the model gets a PNG image of the chart, for a Host that cannot show the App.
3. Send the chart to the chat. The App sends a message about the chart, or about a series or a point, to the
   conversation with `ui/message` of MCP Apps.
4. Save to a dashboard. The user saves the chart to a Grafana dashboard. A map from each chart to a core Grafana
   panel lets a Grafana with no ECharts app open the saved panel.
5. Open a dashboard panel. The App draws a panel of an existing dashboard from its panel JSON.
6. Visualization suggestions. The core Grafana visualization suggestions replace `pick.json`, and the pick moves to
   the App.
7. Load the Renderer from a CDN. The App loads the Renderer at run time. The viz spec and the Renderer API then
   become frozen. The App fills its icon cache when it is built (`renderer.15`). Thus a newer Renderer can need an
   icon that an older App does not have.
8. Annotations. The chart shows the annotations of the query range, and the user can add an annotation.
9. Edit the chart. The user changes the options of the chart in the App, for example with an options pane.
10. Transformations. The Renderer runs the Grafana transformations of a panel.
11. Option docs and model guidance. The model can read the options of each chart and the query rules of each data
    source when it needs them.

A gcx path can be a future addition after the MCP path.
