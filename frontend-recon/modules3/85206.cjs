// webpack module 85206 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./72354.js");
var i = require("./79456.js");
var o = require("./4484.js");
var a = require("./61230.js");
var s = require("./43379.js");
var u = require("./62190.js");
n("match", 1, function (e, t, r) {
  return [function (t) {
    var r = a(this);
    var n = t == undefined ? undefined : t[e];
    if (n !== undefined) {
      return n.call(t, r);
    } else {
      return new RegExp(t)[e](String(r));
    }
  }, function (e) {
    var n = r(t, e, this);
    if (n.done) {
      return n.value;
    }
    var a = i(e);
    var l = String(this);
    if (!a.global) {
      return u(a, l);
    }
    var c = a.unicode;
    a.lastIndex = 0;
    var p;
    var d = [];
    var f = 0;
    while ((p = u(a, l)) !== null) {
      var g = String(p[0]);
      d[f] = g;
      if (g === "") {
        a.lastIndex = s(l, o(a.lastIndex), c);
      }
      f++;
    }
    if (f === 0) {
      return null;
    } else {
      return d;
    }
  }];
});
};
