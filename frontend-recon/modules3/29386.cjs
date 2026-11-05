// webpack module 29386 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composeRef = l;
exports.fillRef = u;
exports.supportNodeRef = d;
exports.supportRef = p;
exports.useComposeRef = c;
var i = n(require("./28004.js"));
var o = require("./59496.js");
var a = require("./61357.js");
var s = n(require("./35622.js"));
function u(e, t) {
  if (typeof e === "function") {
    e(t);
  } else if ((0, i.default)(e) === "object" && e && "current" in e) {
    e.current = t;
  }
}
function l() {
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
        u(t, e);
      });
    };
  }
}
function c() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  return (0, s.default)(function () {
    return l.apply(undefined, t);
  }, t, function (e, t) {
    return e.length !== t.length || e.every(function (e, r) {
      return e !== t[r];
    });
  });
}
function p(e) {
  var t;
  var r;
  var n = (0, a.isMemo)(e) ? e.type.type : e.type;
  return (typeof n !== "function" || (t = n.prototype) !== null && t !== undefined && !!t.render || n.$$typeof === a.ForwardRef) && (typeof e !== "function" || (r = e.prototype) !== null && r !== undefined && !!r.render || e.$$typeof === a.ForwardRef);
}
function d(e) {
  return !!(0, o.isValidElement)(e) && !(0, a.isFragment)(e) && p(e);
}
};
