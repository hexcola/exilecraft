var webpack = require("webpack");
const webpackMerge = require("webpack-merge");
const commonConfig = require("./webpack.common.js");
const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3000;

module.exports = webpackMerge(commonConfig,
{
	debug: true,
	devServer:
	{
		port: PORT,
		host: HOST,
		historyApiFallback: true,
		watchOptions: {
			aggregateTimeout: 300,
			poll: 1000
		},
		outputPath: "build"
	}
});