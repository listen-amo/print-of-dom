const base = require("./base.webpack.config");
const { merge } = require("webpack-merge");
module.exports = merge(base, {
  output: {
    library: {
      name: "printOfDom",
      export: "default",
      type: "window",
    },
  },
});
