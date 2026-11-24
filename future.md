# Future items

These items are not specified yet. The list is in priority order. An item gets its own rules when it is
specified.

1. An image on demand. The App or the model gets a PNG image of the chart, for a Host that cannot show the App.
2. Send the chart to the chat. The App sends a message about the chart, or about a series or a range, to the
   conversation with `ui/message` of MCP Apps. A message about a point is specified (`renderer.30`, `state.20`).
   See https://github.com/grafana/viz-contract/issues/17.
3. The saved panel. `save_chart` saves the chart to a Grafana dashboard (`save.25`). These parts of a save are
   not specified: the JSON of the saved panel, its place in the dashboard, and how the Source knows that a save
   needs the core panel. The tool result must also tell the App if the user can save, so that the App shows no
   Save control that always fails. The core panel of a chart lets a Grafana that cannot draw the panel of the
   chart open the saved panel (`save.1` to `save.10`). The frames of a chart can fit the chart and not its core
   panel (`save.8`). The Source does not query in a save, so it has no frames (`save.35`). The save rules must
   say how a save finds such frames, and what it does then. The saved panel also needs the legend overrides, and
   now only the Renderer has them (`renderer.37`). A legend override is an override property, so the core panel
   gets it or drops it as each other property (`save.4`, `save.10`). The saved panel also has the chart options
   (`tool.41`). Grafana runs the migrations of a panel from the `pluginVersion` of the saved panel. Thus a saved
   panel of the chart needs as its `pluginVersion` the version of the panel that the Source checked the options
   against, and that panel must give its migrations to Grafana. `chart-options.json` gives this version
   (`delivery.23`). A saved core panel has `coreVersion` (`save.2`).
4. Open a dashboard panel. The App draws a panel of an existing dashboard from its panel JSON.
5. Visualization suggestions. The core Grafana visualization suggestions replace `pick.json`, and the pick moves to
   the App.
6. Load the Renderer from a CDN. The App loads the Renderer at run time. The viz spec and the Renderer API then
   become frozen. The App then also loads the `icons.json` of that Renderer (`delivery.9`), and fills the icon
   cache from it (`renderer.15`). Thus an older App gets the icons of a newer Renderer. `icons.json` then needs a
   hash, as the bundle has in `delivery.6`, because its SVG goes into the DOM. The Source then also needs the
   manifest and the `chart-options.json` of that Renderer, and it checks them as in `tool.48` and `tool.49`.
7. Annotations. The chart shows the annotations of the query range. Then `data.annotations` can also have a saved
   annotation (`renderer.63`), and the Renderer must not draw it two times.
8. Edit the chart. The user changes the options of the chart in the App, for example with an options pane.
9. Transformations. The Renderer runs the Grafana transformations of a panel.
10. Model guidance for queries. The model can read the query rules of each data source when it needs them.
11. A regular expression matcher for overrides. An override finds its fields with a pattern, as `byRegexp` of
    Grafana does. The Source must then make sure that the pattern compiles in the browser, and that it cannot make
    the browser slow (`tool.40`).

A gcx path can be a future addition after the MCP path.
