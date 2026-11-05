// webpack module 26036 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./57965.js");
var o = require("./41497.js");
var a = require("./79456.js");
var s = require("./60730.js");
var u = require("./52485.js");
var l = require("./51052.js");
var c = require("./56741.js");
var p = require("./98199.js");
n({
  target: "Map",
  proto: true,
  real: true,
  forced: i
}, {
  mapValues: function (e) {
    var t = a(this);
    var r = c(t);
    var n = u(e, arguments.length > 1 ? arguments[1] : undefined, 3);
    var i = new (l(t, o("Map")))();
    var d = s(i.set);
    p(r, function (e, r) {
      d.call(i, e, n(r, e, t));
    }, undefined, true, true);
    return i;
  }
});
};
