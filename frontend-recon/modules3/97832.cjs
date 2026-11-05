// webpack module 97832 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./29034.js").start;
var o = require("./77157.js");
n({
  target: "String",
  proto: true,
  forced: o
}, {
  padStart: function (e) {
    return i(this, e, arguments.length > 1 ? arguments[1] : undefined);
  }
});
};
