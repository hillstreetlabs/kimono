const webpack = require("webpack");
const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

const config = merge(common, {
  mode: "production",
  entry: ["babel-polyfill", "./src/app.js"],
  output: {
    filename: "bundle-[hash].js"
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production"),
        API_URL: JSON.stringify(process.env.API_URL)
      }
    }),
    new UglifyJsPlugin()
  ],
  optimization: {
    splitChunks: {
      chunks: "all"
    }
  }
});

module.exports = config;
