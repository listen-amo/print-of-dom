const base = require("./base.webpack.config");
const { merge } = require("webpack-merge");
module.exports = merge(base, {
  output: {
    filename: "print-of-dom.cj.js",
    library: {
      export: "default",
      type: "commonjs2",
    },
  },
});
