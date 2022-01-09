const rules = require("./webpack.rules").concat(
  require("./webpack.main.rules")
);
const path = require("path");

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  context: path.resolve(__dirname, "src/main"),
  entry: "index.ts",
  module: {
    rules: rules,
  },
  resolve: {
    modules: [path.resolve(__dirname, "src/main"), "node_modules"],
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
