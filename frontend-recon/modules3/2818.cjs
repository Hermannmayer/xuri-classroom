// webpack module 2818 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  q3: function () {
    return s;
  },
  qI: function () {
    return u;
  },
  RV: function () {
    return l;
  },
  Rk: function () {
    return c;
  },
  aM: function () {
    return p;
  },
  Ux: function () {
    return d;
  }
});
var n = require("./34256.js");
var i = require("./95611.js");
var o = require("./91842.js");
var a = require("./59496.js");
var s = a.createContext({
  labelAlign: "right",
  vertical: false,
  itemRef: function () {}
});
var u = a.createContext(null);
function l(e) {
  var t = (0, o.Z)(e, ["prefixCls"]);
  return a.createElement(i.FormProvider, (0, n.Z)({}, t));
}
var c = a.createContext({
  prefixCls: ""
});
var p = a.createContext({});
function d(e) {
  var t = e.children;
  var r = e.status;
  var i = e.override;
  var o = (0, a.useContext)(p);
  var s = (0, a.useMemo)(function () {
    var e = (0, n.Z)({}, o);
    if (i) {
      delete e.isFormItemInput;
    }
    if (r) {
      delete e.status;
      delete e.hasFeedback;
      delete e.feedbackIcon;
    }
    return e;
  }, [r, i, o]);
  return a.createElement(p.Provider, {
    value: s
  }, t);
}
};
