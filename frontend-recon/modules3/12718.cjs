// webpack module 12718 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./92695.js");
var o = require("./54295.js");
var a = require("./82369.js");
var s = require("./18203.js");
var u = require("./75386.js");
var l = require("./26244.js");
var c = require("./98199.js");
var p = require("./52141.js");
var d = require("./71478.js");
var f = d.set;
var g = d.getterFor("AggregateError");
function m(e, t) {
  var r = this;
  if (!(r instanceof m)) {
    return new m(e, t);
  }
  if (a) {
    r = a(new Error(t), o(r));
  }
  var n = [];
  c(e, n.push, n);
  if (i) {
    f(r, {
      errors: n,
      type: "AggregateError"
    });
  } else {
    r.errors = n;
  }
  if (t !== undefined) {
    p(r, "message", String(t));
  }
  return r;
}
m.prototype = s(Error.prototype, {
  constructor: l(5, m),
  message: l(5, ""),
  name: l(5, "AggregateError")
});
if (i) {
  u.f(m.prototype, "errors", {
    get: function () {
      return g(this).errors;
    },
    configurable: true
  });
}
n({
  global: true
}, {
  AggregateError: m
});
};
