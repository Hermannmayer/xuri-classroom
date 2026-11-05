// webpack module 84342 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./79456.js");
var a = require("./89170.js");
var s = require("./98199.js");
n({
  target: "Set",
  proto: true,
  real: true,
  forced: i
}, {
  join: function (e) {
    var t = o(this);
    var r = a(t);
    var n = e === undefined ? "," : String(e);
    var i = [];
    s(r, i.push, i, false, true);
    return i.join(n);
  }
});
};
