const base = require("./base.webpack.config");
const { merge } = require("webpack-merge");
module.exports = merge(base, {
  experiments: {
    outputModule: true,
  },
  output: {
    filename: "print-of-dom.module.js",
    library: {
      type: "module",
    },
  },
});
