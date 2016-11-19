var path = require('path');
var glob = require("glob");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports =
	{
		output:
		{
			path: "build",
			filename: "[name].bundle.js",
			sourceMapFilename: "[name].map",
			chunkFilename: "[id].chunk.js"
		},
		entry:
		{
			"vendor": "./src/vendor.ts",
			"polyfill": "./src/polyfill.ts",
			"images": glob.sync("./src/assets/images/bundled/*.*").concat("./src/images.ts"),
			"data": glob.sync("./src/assets/data/*.json").concat("./src/data.ts"),
			"main": "./src/main.ts"
		},
		resolve:
		{
			extensions: ["", ".ts", ".js", ".json", ".scss", ".html"],
			root: path.resolve("./src"),
			modulesDirectories: ["node_modules"],
		},
		module:
		{
			loaders: [
			{
				test: /\.json$/,
				loader: "json"
			},
			{
				test: /\.ts$/,
				loaders: ["angular2-template-loader", "ts"]
			},
			{
				test: /\.scss$/,
				loaders: ["style", "css", "sass"]
			},
			{
				test: /\.html$/,
				loaders: ["html-loader"],
				exclude: ["src/index.html"]
			},
			{
				test: /\leftarrow/ig,
				loader: "file"
			},
			{
				test: /\.(png|jpg|gif)$/,
				loader: "base64",
				exclude: [path.resolve("src/assets/images/leftarrow.png")]
			}]
		},
		sassLoader:
		{
			includePaths: ["node_modules/compass-mixins/lib"]
		},
		htmlLoader:
		{
			minimize: true,
			removeAttributeQuotes: false,
			caseSensitive: true,
			customAttrSurround: [ [/#/, /(?:)/], [/\*/, /(?:)/], [/\[?\(?/, /(?:)/] ],
			customAttrAssign: [ /\)?\]?=/ ],
			conservativeCollapse: false
		},
		plugins:
		[
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.CommonsChunkPlugin({
				name: ["vendor", "polyfill", "images", "data", "main"].reverse()
			}),
			new HtmlWebpackPlugin({
				template: "src/index.html",
				chunksSortMode: "dependency"
			})
		]
	};