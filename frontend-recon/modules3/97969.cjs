// webpack module 97969 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  mH: function () {
    return a;
  },
  sQ: function () {
    return s;
  },
  x1: function () {
    return u;
  },
  Yr: function () {
    return l;
  }
});
var n = require("./75728.js");
require("./59496.js");
var i = require("./61357.js");
var o = require("./64057.js");
function a(e, t) {
  if (typeof e === "function") {
    e(t);
  } else if ((0, n.Z)(e) === "object" && e && "current" in e) {
    e.current = t;
  }
}
function s() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  var n = t.filter(function (e) {
    return e;
  });
  if (n.length <= 1) {
    return n[0];
  } else {
    return function (e) {
      t.forEach(function (t) {
        a(t, e);
      });
    };
  }
}
function u() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  return (0, o.Z)(function () {
    return s.apply(undefined, t);
  }, t, function (e, t) {
    return e.length !== t.length || e.every(function (e, r) {
      return e !== t[r];
    });
  });
}
function l(e) {
  var t;
  var r;
  var n = (0, i.isMemo)(e) ? e.type.type : e.type;
  return (typeof n !== "function" || (t = n.prototype) !== null && t !== undefined && !!t.render || n.$$typeof === i.ForwardRef) && (typeof e !== "function" || (r = e.prototype) !== null && r !== undefined && !!r.render || e.$$typeof === i.ForwardRef);
}
};
