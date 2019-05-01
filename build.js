const fsp = require("fs").promises;
const fs = require("fs");
const path = require("path");

process.on(
	"unhandledRejection", 
	(reason, promise) => {
		console.log("[" + process.pid + "] Unhandled Rejection at: Promise", promise, "reason", reason);
		
		process.exit(1);
	}
);

process.on(
	"uncaughtException", 
	(error) => {
		console.log("[" + process.pid + "] Unhandled exception.");
		console.error(error);
		
		process.exit(1);
	}
);


(async() => {
	if(!fs.existsSync(path.join(__dirname, "dist")))
	{
		await fsp.mkdir(path.join(__dirname, "dist"));
	}

	if(!fs.existsSync(path.join(__dirname, "dist/browser")))
	{
		await fsp.mkdir(path.join(__dirname, "dist/browser"));
	}

	const strBrowserFilePath = path.join(__dirname, "dist/browser/sql-performance-counters-ui.js");
	
	const strTheOneAndOnlyFile = await fsp.readFile("./src/SQLPerformanceTable.js", "utf8");
	const strOutputFileContents = strTheOneAndOnlyFile
		.replace(/module\.exports[^\r\n]+;/gm, "")
		.replace(/^[\s]{0,}const[\s]+[^\r\n]+require[^\r\n]+;/gm, "")
	;
	await fsp.writeFile(strBrowserFilePath, strOutputFileContents);
})();

