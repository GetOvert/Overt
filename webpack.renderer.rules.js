module.exports = [
  {
    test: /\.[jt]sx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: "ts-loader",
      options: {
        transpileOnly: true,
      },
    },
  },
  {
    test: /(?<!\.lit)\.css$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }],
  },
  {
    test: /\.lit\.css$/,
    use: [{ loader: "lit-css-loader", options: { include: ["**/*.lit.css"] } }],
  },
  {
    test: /\.svg$/,
    type: "asset/resource",
  },
];
