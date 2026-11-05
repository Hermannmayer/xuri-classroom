// webpack module 91436 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./1586.js");
var o = require("./41630.js");
var a = require("./4484.js");
var s = require("./78426.js");
var u = require("./99180.js");
n({
  target: "Array",
  proto: true
}, {
  flat: function () {
    var e = arguments.length ? arguments[0] : undefined;
    var t = o(this);
    var r = a(t.length);
    var n = u(t, 0);
    n.length = i(n, t, t, r, 0, e === undefined ? 1 : s(e));
    return n;
  }
});
};
