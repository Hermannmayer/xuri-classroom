// webpack module 42885 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  B: function () {
    return d;
  },
  PZ: function () {
    return f;
  },
  WT: function () {
    return g;
  },
  dh: function () {
    return v;
  }
});
require("./12831.js");
var n = require("./12708.js");
var i = require("./23874.js");
var o = require("./59496.js");
var a = require("./72100.js");
var s = a;
var u = require("./11333.js");
var l = u;
require("./15400.js");
require("./38301.js");
require("./78922.js");
require("./90908.js");
require("./19255.js");
require("./68569.js");
require("./52733.js");
var c = require("./88769.js");
var p = require("./4637.js");
var d = new s();
d.setMaxListeners(5);
var f = Symbol("LANG_CHANGE");
function g() {
  var t = (0, c.Kd)();
  if (l !== null && l !== undefined && l.locale) {
    l.locale(c.H8[t]?.momentLocale || "");
  }
  (0, c.cv)(t);
}
var m = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined" ? o.useLayoutEffect : o.useEffect;
function v(e) {
  var r = o.useState(function () {
    return (0, c.Kd)();
  });
  var a = (0, i.Z)(r, 2);
  var s = a[0];
  var u = a[1];
  var g = o.useState(function () {
    return (0, c.lw)(s, true);
  });
  var v = (0, i.Z)(g, 2);
  var y = v[0];
  var h = v[1];
  function b(e) {
    if (l !== null && l !== undefined && l.locale) {
      l.locale(c.H8[e]?.momentLocale || "en");
    }
    u(e);
    h((0, c.lw)(e));
  }
  m(function () {
    d.on(f, b);
    return function () {
      d.off(f, b);
    };
  }, []);
  var w = {};
  var x = (0, c.Mg)();
  return (0, p.jsx)(n.ZP, {
    direction: x,
    locale: c.H8[s]?.antd || w,
    children: (0, p.jsx)(c.eU, {
      value: y,
      children: e.children
    })
  });
}
};
