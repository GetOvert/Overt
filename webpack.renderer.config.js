const rules = require("./webpack.rules").concat(
  require("./webpack.renderer.rules")
);
const plugins = require("./webpack.plugins");
const path = require("path");

module.exports = {
  context: path.resolve(__dirname, "src/renderer"),
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    modules: [path.resolve(__dirname, "src/renderer"), "node_modules"],
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
  },
};
