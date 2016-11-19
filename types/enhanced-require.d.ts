declare function require(moduleName : string);

declare namespace require
{
	interface EnhancedRequireContext
	{
		keys();
		(fileName : string);
	}

	function context(directory : string, includeSubDirectories : boolean, fileRegex : RegExp) : EnhancedRequireContext;
}
