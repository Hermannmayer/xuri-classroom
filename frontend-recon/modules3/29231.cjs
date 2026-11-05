// webpack module 29231 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./1586.js");
var o = require("./41630.js");
var a = require("./4484.js");
var s = require("./60730.js");
var u = require("./99180.js");
n({
  target: "Array",
  proto: true
}, {
  flatMap: function (e) {
    var t;
    var r = o(this);
    var n = a(r.length);
    s(e);
    t = u(r, 0);
    t.length = i(t, r, r, n, 0, 1, e, arguments.length > 1 ? arguments[1] : undefined);
    return t;
  }
});
};
