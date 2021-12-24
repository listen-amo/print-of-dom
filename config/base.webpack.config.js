module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    path: __dirname + "/../dist",
    filename: "print-of-dom.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: "> 1%",
                    useBuiltIns: "usage",
                    corejs: 3,
                  },
                ],
              ],
            },
          },
        ],
      },
    ],
  },
};
