// webpack module 82945 — body from webcrack
module.exports = function (module, exports, require) {
require("./22767.js");
var n = require("./59496.js");
var i = 60103;
exports.Fragment = 60107;
if (typeof Symbol === "function" && Symbol.for) {
  var o = Symbol.for;
  i = o("react.element");
  exports.Fragment = o("react.fragment");
}
var a = n.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
var s = Object.prototype.hasOwnProperty;
var u = {
  key: true,
  ref: true,
  __self: true,
  __source: true
};
function l(e, t, r) {
  var n;
  var o = {};
  var l = null;
  var c = null;
  if (r !== undefined) {
    l = "" + r;
  }
  if (t.key !== undefined) {
    l = "" + t.key;
  }
  if (t.ref !== undefined) {
    c = t.ref;
  }
  for (n in t) {
    if (s.call(t, n) && !u.hasOwnProperty(n)) {
      o[n] = t[n];
    }
  }
  if (e && e.defaultProps) {
    t = e.defaultProps;
    for (n in t) {
      if (o[n] === undefined) {
        o[n] = t[n];
      }
    }
  }
  return {
    $$typeof: i,
    type: e,
    key: l,
    ref: c,
    props: o,
    _owner: a.current
  };
}
exports.jsx = l;
exports.jsxs = l;
};
