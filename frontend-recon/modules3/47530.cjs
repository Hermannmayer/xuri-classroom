// webpack module 47530 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return u;
  }
});
var n = require("./23874.js");
var i = require("./56697.js");
var o = require("./88174.js");
var a = require("./64515.js");
function s(e) {
  return e !== undefined;
}
function u(e, t) {
  var r = t || {};
  var u = r.defaultValue;
  var l = r.value;
  var c = r.onChange;
  var p = r.postState;
  var d = (0, a.Z)(function () {
    if (s(l)) {
      return l;
    } else if (s(u)) {
      if (typeof u === "function") {
        return u();
      } else {
        return u;
      }
    } else if (typeof e === "function") {
      return e();
    } else {
      return e;
    }
  });
  var f = (0, n.Z)(d, 2);
  var g = f[0];
  var m = f[1];
  var v = l !== undefined ? l : g;
  var y = p ? p(v) : v;
  var h = (0, i.Z)(c);
  var b = (0, a.Z)([v]);
  var w = (0, n.Z)(b, 2);
  var x = w[0];
  var E = w[1];
  (0, o.o)(function () {
    var e = x[0];
    if (g !== e) {
      h(g, e);
    }
  }, [x]);
  (0, o.o)(function () {
    if (!s(l)) {
      m(l);
    }
  }, [l]);
  var k = (0, i.Z)(function (e, t) {
    m(e, t);
    E([v], t);
  });
  return [y, k];
}
};
