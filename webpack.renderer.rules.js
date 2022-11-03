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
    test: /\.lit\.css$/,
    use: [
      {
        loader: "css-loader",
        options: {
          exportType: "css-style-sheet",
        },
      },
    ],
  },
  {
    test: /(?<!\.lit)\.css$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }],
  },
  {
    test: /\.svg$/,
    type: "asset/resource",
  },
];
