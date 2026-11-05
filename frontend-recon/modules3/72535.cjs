// webpack module 72535 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./56237.js");
var i = {
  childContextTypes: true,
  contextType: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDefaultProps: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  mixins: true,
  propTypes: true,
  type: true
};
var o = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true
};
var a = {
  $$typeof: true,
  render: true,
  defaultProps: true,
  displayName: true,
  propTypes: true
};
var s = {
  $$typeof: true,
  compare: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
  type: true
};
var u = {};
function l(e) {
  if (n.isMemo(e)) {
    return s;
  } else {
    return u[e.$$typeof] || i;
  }
}
u[n.ForwardRef] = a;
u[n.Memo] = s;
var c = Object.defineProperty;
var p = Object.getOwnPropertyNames;
var d = Object.getOwnPropertySymbols;
var f = Object.getOwnPropertyDescriptor;
var g = Object.getPrototypeOf;
var m = Object.prototype;
function v(e, t, r) {
  if (typeof t !== "string") {
    if (m) {
      var n = g(t);
      if (n && n !== m) {
        v(e, n, r);
      }
    }
    var i = p(t);
    if (d) {
      i = i.concat(d(t));
    }
    var a = l(e);
    var s = l(t);
    for (var u = 0; u < i.length; ++u) {
      var y = i[u];
      if (!o[y] && (!r || !r[y]) && (!s || !s[y]) && (!a || !a[y])) {
        var h = f(t, y);
        try {
          c(e, y, h);
        } catch (b) {}
      }
    }
  }
  return e;
}
module.exports = v;
};
