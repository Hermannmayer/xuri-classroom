// webpack module 4412 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./46979.js");
var o = require("./61230.js");
var a = require("./30268.js");
n({
  target: "String",
  proto: true,
  forced: !a("includes")
}, {
  includes: function (e) {
    return !!~String(o(this)).indexOf(i(e), arguments.length > 1 ? arguments[1] : undefined);
  }
});
};
