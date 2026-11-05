// webpack module 53645 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./44283.js");
var o = require("./41497.js");
n({
  global: true
}, {
  compositeSymbol: function () {
    if (arguments.length === 1 && typeof arguments[0] === "string") {
      return o("Symbol").for(arguments[0]);
    } else {
      return i.apply(null, arguments).get("symbol", o("Symbol"));
    }
  }
});
};
