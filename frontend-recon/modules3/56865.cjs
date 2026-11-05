// webpack module 56865 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
var i = require("./28004.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o = n(require("./38524.js"));
var a = c(require("./59496.js"));
var s = n(require("./98754.js"));
var u = n(require("./87809.js"));
function l(e) {
  if (typeof WeakMap != "function") {
    return null;
  }
  var t = new WeakMap();
  var r = new WeakMap();
  return (l = function (e) {
    if (e) {
      return r;
    } else {
      return t;
    }
  })(e);
}
function c(e, t) {
  if (!t && e && e.__esModule) {
    return e;
  }
  if (e === null || i(e) != "object" && typeof e != "function") {
    return {
      default: e
    };
  }
  var r = l(t);
  if (r && r.has(e)) {
    return r.get(e);
  }
  var n = {
    __proto__: null
  };
  var o = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var a in e) {
    if (a !== "default" && {}.hasOwnProperty.call(e, a)) {
      var s = o ? Object.getOwnPropertyDescriptor(e, a) : null;
      if (s && (s.get || s.set)) {
        Object.defineProperty(n, a, s);
      } else {
        n[a] = e[a];
      }
    }
  }
  n.default = e;
  if (r) {
    r.set(e, n);
  }
  return n;
}
function p(e, t) {
  return a.createElement(u.default, (0, o.default)((0, o.default)({}, e), {}, {
    ref: t,
    icon: s.default
  }));
}
var d = a.forwardRef(p);
exports.default = d;
};
