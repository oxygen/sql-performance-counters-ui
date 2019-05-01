const sqlFormatter = require("sql-formatter");
const hljs = require("highlight.js");


class SQLPerformanceTable
{
	/**
	 * If strLanguage is not set, it will default to navigator.language if a translation exists, otherwise "en" (English).
	 * 
	 * @param {string|undefined} strLanguage = undefined
	 */
	constructor(strLanguage = undefined)
	{
		this._strLanguageCode = strLanguage || navigator.language;

		this._objSQLQueriesToPerformanceCounters = {};
		this._mapSQLQueryToTableRow = new Map();

		this._stCurrentSortColumnName = "fetchedRows";
		this._strCurrentSortDirection = "DESC";

		this._promiseSortingSQLQueriesTable = null;

		this._elTable = document.createElement("table");
		
		// Bootstrap specific.
		this._elTable.classList.add("table");
		this._elTable.classList.add("table-hover");


		// For destroy.
		this._arrDisposeCalls = [];
		
		// For destroy or clear.
		this._arrDisposeCallsTableRows = [];

		this._initTable();
	}


	/**
	 * Removes events listeners, removes the table from its parent node and sets various stuff to null.
	 */
	destroy()
	{
		if(!this._arrDisposeCalls)
		{
			return;
		}

		if(this._elTable)
		{
			if(this._elTable.parentNode)
			{
				this._elTable.parentNode.removeChild(this._elTable);
			}

			this._elTable = null;
		}

		this._promiseSortingSQLQueriesTable = null;

		this._mapSQLQueryToTableRow.clear();
		this._mapSQLQueryToTableRow = null;

		this._arrDisposeCalls.map(fnDispose => { fnDispose(); });
		this._arrDisposeCalls.splice(0);
		this._arrDisposeCalls = null;

		this._objSQLQueriesToPerformanceCounters = {};
	}


	/**
	 * @returns {HTMLElementTable}
	 */
	get table()
	{
		return this._elTable;
	}


	/**
	 * @returns {Object.<string, translation: string>}
	 */
	get texts()
	{
		if(SQLPerformanceTable.texts[this._strLanguageCode || navigator.language])
		{
			return SQLPerformanceTable.texts[this._strLanguageCode || navigator.language];
		}

		return SQLPerformanceTable.texts["en"];
	}


	/**
	 * Clears the table keeping the header.
	 */
	clear()
	{
		this._mapSQLQueryToTableRow.clear();

		this._arrDisposeCallsTableRows.map(fnDispose => { fnDispose(); });
		this._arrDisposeCallsTableRows.splice(0);
		
		while(this._elTable.rows.length > 1)
		{
			this._elTable.deleteRow(this._elTable.rows.length - 1);
		}

		this._objSQLQueriesToPerformanceCounters = {};
	}


	/**
	 * objSQLToPerformanceCounters may contain only newly modified queries.
	 * 
	 * @param {Object<string, metrics:{successCount: number, errorCount: number, successMillisecondsTotal: number, fetchedRows: number, affectedRows: number, changedRows: 0, errorMillisecondsTotal: number, successMillisecondsAverage: number, errorMillisecondsAverage: number}>} objSQLToPerformanceCounters
	 * @param {boolean} bClearExisting
	 */
	update(objSQLToPerformanceCounters, bClearExisting = false)
	{
		if(bClearExisting)
		{
			this.clear();
		}


		Object.assign(this._objSQLQueriesToPerformanceCounters, objSQLToPerformanceCounters);


		for(const strSQL in this._objSQLQueriesToPerformanceCounters)
		{
			let elRow = this._mapSQLQueryToTableRow.get(strSQL);
			if(!elRow)
			{
				elRow = this._elTable.insertRow(-1);
				this._mapSQLQueryToTableRow.set(strSQL, elRow);

				for(const strColumnName of SQLPerformanceTable.columnNames)
				{
					const elCell = elRow.insertCell(-1);

					if(strColumnName === "query")
					{
						const elCodeSQL = document.createElement("code");
						elCodeSQL.innerText = strSQL;

						const elCodeSQLFormatted = document.createElement("code");
						elCodeSQLFormatted.innerText = sqlFormatter.format(strSQL);
						elCodeSQLFormatted.style.whiteSpace = "pre-wrap";
						
						hljs.highlightBlock(elCodeSQL);
						hljs.highlightBlock(elCodeSQLFormatted);
						
						elCell.appendChild(elCodeSQL);
						elCell.appendChild(elCodeSQLFormatted);

						elCodeSQLFormatted.style.display = "none";

						elCell.style.cursor = "pointer";
						const fnOnClick = (() => {
							if(elCodeSQLFormatted.style.display === "none")
							{
								elCodeSQLFormatted.style.display = "";
								elCodeSQL.style.display = "none";
							}
							else
							{
								elCodeSQLFormatted.style.display = "none";
								elCodeSQL.style.display = "";
							}
						}).bind(this);
						elCodeSQL.addEventListener("click", fnOnClick);
						this._arrDisposeCallsTableRows.push(() => { elCodeSQL.removeEventListener("click", fnOnClick); });
						elCodeSQLFormatted.addEventListener("click", fnOnClick);
						this._arrDisposeCallsTableRows.push(() => { elCodeSQLFormatted.removeEventListener("click", fnOnClick); });
					}
					else
					{
						elCell.innerText = this._renderValue(strColumnName, this._objSQLQueriesToPerformanceCounters[strSQL]);
						elCell.title = strColumnName;
						elCell.style.textAlign = "right";
						elCell.style.whiteSpace = "pre";
					}
				}
			}
			else
			{
				for(const nColumnIndex in SQLPerformanceTable.columnNames)
				{
					const elCell = elRow.cells.item(nColumnIndex + 1);

					if(elCell)
					{
						elCell.innerText = this._renderValue(/*strColumnName*/ elCell.title, objSQLToPerformanceCounters[strSQL]);
					}
				}
			}
		}

		this.sort(this._stCurrentSortColumnName, this._strCurrentSortDirection);
	}


	/**
	 * Sorts the table in place by moving the rows using HTMLElement.insertBefore().
	 * 
	 * @param {string} strColumnName = "fetchedRows"
	 * @param {string} strSortDirection = "DESC"
	 */
	sort(strColumnName = "fetchedRows", strSortDirection = "DESC")
	{
		if(
			strColumnName === this._stCurrentSortColumnName
			&& strSortDirection === this._strCurrentSortDirection
		)
		{
			return;
		}


		this._stCurrentSortColumnName = strColumnName;
		this._strCurrentSortDirection = strSortDirection;


		const mapObjectToSQL = new Map();
		for(const strSQL in this._objSQLQueriesToPerformanceCounters)
		{
			mapObjectToSQL.set(this._objSQLQueriesToPerformanceCounters[strSQL], strSQL);
		}

		const arrDataRows = Object.values(this._objSQLQueriesToPerformanceCounters);

		arrDataRows.sort((objPerformanceCountersA, objPerformanceCountersB) => {
			return (strSortDirection === "ASC" ? 1 : -1) * (objPerformanceCountersB[strColumnName] - objPerformanceCountersA[strColumnName]);
		});

		// console.log(`Sorting ${strColumnName} ${strSortDirection}`, arrDataRows);

		let elPreviousRow = null;
		for(let i = 0; i < arrDataRows.length; i++)
		{
			const objPerformanceCounters = arrDataRows[i];
			const strSQL = mapObjectToSQL.get(objPerformanceCounters);

			if(strSQL)
			{
				const elRow = this._mapSQLQueryToTableRow.get(strSQL);

				if(elRow)
				{
					if(elPreviousRow)
					{
						elRow.parentNode.insertBefore(elRow, elPreviousRow);
					}

					elPreviousRow = elRow;
				}
				else
				{
					console.error(`Could not find table row for ${strSQL} when sorting.`);
				}
			}
			else
			{
				console.error(`Could not find SQL for performance counters object ${JSON.stringify(objPerformanceCounters)}`);
			}
		}
	}


	_renderValue(strColumnName, objSQLToPerformanceCounter)
	{
		let strText;
		
		if(["successMillisecondsTotal", "errorMillisecondsTotal"].includes(strColumnName))
		{
			const nSeconds = parseInt(objSQLToPerformanceCounter[strColumnName] / 1000);
			strText = `${nSeconds} ${nSeconds === 1 ? this.texts.secondShort : this.texts.secondsShort}`;
		}
		else if(["successMillisecondsAverage", "errorMillisecondsAverage"].includes(strColumnName))
		{
			const nMilliseconds = objSQLToPerformanceCounter[strColumnName];
			strText = `${nMilliseconds} ${nMilliseconds === 1 ? this.texts.millisecondShort : this.texts.millisecondsShort}`;
		}
		else
		{
			strText = objSQLToPerformanceCounter[strColumnName];
		}

		return strText;
	}


	/**
	 * Adds a header row into this._elTable and click event listeners for sortable columns.
	 */
	_initTable()
	{
		if(this._elTable.rows.length)
		{
			return;
		}

		const elRowHeader = this._elTable.insertRow(-1);

		for(const strColumnName of SQLPerformanceTable.columnNames)
		{
			const elCell = elRowHeader.insertCell(-1);
			elCell.textContent = this.texts[strColumnName];
			elCell.title = strColumnName;
			elCell.style.fontWeight = "bold";

			if(strColumnName !== "query")
			{
				elCell.style.cursor = "pointer";

				const fnOnClick = (async() => {
					let strSortDirection;
					if(this._stCurrentSortColumnName === strColumnName)
					{
						strSortDirection = this._strCurrentSortDirection === "DESC" ? "ASC" : "DESC";
					}
					else
					{
						strSortDirection = "DESC";
					}

					this.sort(strColumnName, strSortDirection).catch(console.error);
				}).bind(this);
	
				elCell.addEventListener("click", fnOnClick);
				this._arrDisposeCalls.push(() => { elCell.removeEventListener("click", fnOnClick); });
			}
		}
	}
};


// Except for "query", all other column names are sortable, see SQLPerformanceTable.sort().
SQLPerformanceTable.columnNames = [
	"query", 
	"fetchedRows", 
	"affectedRows", 
	"changedRows",
	"successCount", 
	"successMillisecondsAverage",
	"successMillisecondsTotal",
	"errorCount", 
	"errorMillisecondsAverage", 
	"errorMillisecondsTotal"
];


// Feel free to add translations after importing the class into your scope.
SQLPerformanceTable.texts = {
	en: {
		query: "SQL query", 
		fetchedRows: "Fetched rows", 
		affectedRows: "Affected rows", 
		changedRows: "Changed rows",
		successCount: "Success count", 
		successMillisecondsAverage: "Success average duration",
		successMillisecondsTotal: "Total duration",
		errorCount: "No. of errors", 
		errorMillisecondsAverage: "Error average duration", 
		errorMillisecondsTotal: "Total error duration",

		second: "second",
		seconds: "seconds",
		millisecond: "millisecond",
		milliseconds: "milliseconds",
		secondShort: "sec",
		secondsShort: "sec",
		millisecondShort: "ms",
		millisecondsShort: "ms"
	},

	ro: {
		query: "Interogare", 
		fetchedRows: "Rânduri întoarse", 
		affectedRows: "Rânduri afectate", 
		changedRows: "Rânduri schimbate",
		successCount: "Nr. rulări cu succes", 
		successMillisecondsAverage: "Medie rulare cu succes",
		successMillisecondsTotal: "Total rulări cu succes",
		errorCount: "Nr. erori", 
		errorMillisecondsAverage: "Medie rulare erori", 
		errorMillisecondsTotal: "Total rulare erori",

		second: "secundă",
		seconds: "secunde",
		millisecond: "milisecundă",
		milliseconds: "milisecunde",
		secondShort: "sec",
		secondsShort: "sec",
		millisecondShort: "ms",
		millisecondsShort: "ms"
	}
};


SQLPerformanceTable.texts["ro-RO"] = SQLPerformanceTable.texts.ro;
SQLPerformanceTable.texts["ro-MD"] = SQLPerformanceTable.texts.ro;
SQLPerformanceTable.texts["en-US"] = SQLPerformanceTable.texts.en;
SQLPerformanceTable.texts["en-UK"] = SQLPerformanceTable.texts.en;


module.exports = SQLPerformanceTable;
