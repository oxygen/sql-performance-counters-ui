# sql-performance-counters-ui
Updatable (live) HTML table for [sql-performance-counters](https://github.com/oxygen/sql-performance-counters-nodejs) data, with syntax coloring and formatting too.

It looks like this:

![Preview](res/preview.png?raw=true "Preview")

Clicking a query will expand it into the formatted version.

Clicking a column will sort the table.

When updating with new data, the table is updated and sorted in place for performance.

## Installation:

```shell
npm i sql-performance-counters-ui
```

(and, if you don't have a build system):
```html
<!-- NEVER serve static content directly from node_modules! Just illustrating the file paths here. -->
<script src="/node_modules/sql-formatter/dist/sql-formatter.min.js"></script>

<!-- https://highlightjs.org/download/ to create your own custom minified build -->
<link rel="stylesheet" href="/path/to/highlight.js/styles/tomorrow-night.css">
<script src="/path/to/highlight.js/highlight.pack.js"></script>

<script src="/node_modules/sql-performance-counters-ui/dist/browser/sql-performance-counters-ui.js"></script>

<script>
	// The SQLPerformanceTable class is available globally on the window object.
	new SQLPerformanceTable();
</script>
```

Both `hljs` (highlight.js) and `sqlFormatter` (sql-formatter) are optional wether using a build system or not.
When using a build system they can be excluded from the build (Webpack externals) and all will work fine without them.


## Usage

See [SQLPerformanceTable.js](./src/SQLPerformanceTable.js) for public methods, usage and customizable defaults (like translations).

```JavaScript
// If not already on window, import or require.
const SQLPerformanceTable = require("sql-performance-counters-ui").SQLPerformanceTable;


const sqlPerformanceTable = new SQLPerformanceTable(navigator.language);

document.body.appendChild(sqlPerformanceTable.table);


setInterval(
	async() => {
		const objSQLPerformanceCounters = await yourAPIClient.sql_performance_counters();

		sqlPerformanceTable.update(objSQLPerformanceCounters, /*bClearExisting*/ true);

		// If bClearExisting is false (the default), objSQLPerformanceCounters is allowed to contain partial data to only update recent changes.
		// When clearing data on the server, either specify bClearExisting as true, or call SQLPerformanceTable.clear() directly.
	}, 
	30 * 1000
);


// When the table isn't needed anymore, call the destructor to remove event listeners, references and remove the HTMLTable element from the DOM.
sqlPerformanceTable.destroy();
```
