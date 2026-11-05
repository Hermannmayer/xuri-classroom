// webpack module 18268 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return I;
  }
});
var n = require("./91613.js");
var i = require("./23874.js");
var o = require("./21487.js");
var a = require("./37913.js");
var s = require("./59496.js");
var u = require("./38399.js");
var l = u;
var c = require("./60816.js");
var p = require("./75728.js");
var d = require("./56088.js");
var f = require("./68044.js");
var g = require("./96417.js");
var m = require("./67186.js");
var v = m;
function y(e, t) {
  (0, f.ZP)(e, `[@ant-design/icons] ${t}`);
}
function h(e) {
  return (0, p.Z)(e) === "object" && typeof e.name === "string" && typeof e.theme === "string" && ((0, p.Z)(e.icon) === "object" || typeof e.icon === "function");
}
function b(e = {}) {
  return Object.keys(e).reduce(function (t, r) {
    var n = e[r];
    switch (r) {
      case "class":
        t.className = n;
        delete t.class;
        break;
      default:
        delete t[r];
        t[v(r)] = n;
    }
    return t;
  }, {});
}
function w(e, t, r) {
  if (r) {
    return s.createElement(e.tag, (0, n.Z)((0, n.Z)({
      key: t
    }, b(e.attrs)), r), (e.children || []).map(function (r, n) {
      return w(r, `${t}-${e.tag}-${n}`);
    }));
  } else {
    return s.createElement(e.tag, (0, n.Z)({
      key: t
    }, b(e.attrs)), (e.children || []).map(function (r, n) {
      return w(r, `${t}-${e.tag}-${n}`);
    }));
  }
}
function x(e) {
  return (0, d.generate)(e)[0];
}
function E(e) {
  if (e) {
    if (Array.isArray(e)) {
      return e;
    } else {
      return [e];
    }
  } else {
    return [];
  }
}
var k = "\n.anticon {\n  display: inline-flex;\n  alignItems: center;\n  color: inherit;\n  font-style: normal;\n  line-height: 0;\n  text-align: center;\n  text-transform: none;\n  vertical-align: -0.125em;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.anticon > * {\n  line-height: 1;\n}\n\n.anticon svg {\n  display: inline-block;\n}\n\n.anticon::before {\n  display: none;\n}\n\n.anticon .anticon-icon {\n  display: block;\n}\n\n.anticon[tabindex] {\n  cursor: pointer;\n}\n\n.anticon-spin::before,\n.anticon-spin {\n  display: inline-block;\n  -webkit-animation: loadingCircle 1s infinite linear;\n  animation: loadingCircle 1s infinite linear;\n}\n\n@-webkit-keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n\n@keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n";
function S(e = k) {
  var t = (0, s.useContext)(c.Z);
  var r = t.csp;
  (0, s.useEffect)(function () {
    (0, g.hq)(e, "@ant-design-icons", {
      prepend: true,
      csp: r
    });
  }, []);
}
var T = ["icon", "className", "onClick", "style", "primaryColor", "secondaryColor"];
var C = {
  primaryColor: "#333",
  secondaryColor: "#E6E6E6",
  calculated: false
};
function A(e) {
  var t = e.primaryColor;
  var r = e.secondaryColor;
  C.primaryColor = t;
  C.secondaryColor = r || x(t);
  C.calculated = !!r;
}
function _() {
  return (0, n.Z)({}, C);
}
function O(e) {
  var t = e.icon;
  var r = e.className;
  var i = e.onClick;
  var o = e.style;
  var s = e.primaryColor;
  var u = e.secondaryColor;
  var l = (0, a.Z)(e, T);
  var c = C;
  if (s) {
    c = {
      primaryColor: s,
      secondaryColor: u || x(s)
    };
  }
  S();
  y(h(t), `icon should be icon definiton, but got ${t}`);
  if (!h(t)) {
    return null;
  }
  var p = t;
  if (p && typeof p.icon === "function") {
    p = (0, n.Z)((0, n.Z)({}, p), {}, {
      icon: p.icon(c.primaryColor, c.secondaryColor)
    });
  }
  return w(p.icon, `svg-${p.name}`, (0, n.Z)({
    className: r,
    onClick: i,
    style: o,
    "data-icon": p.name,
    width: "1em",
    height: "1em",
    fill: "currentColor",
    "aria-hidden": "true"
  }, l));
}
O.displayName = "IconReact";
O.getTwoToneColors = _;
O.setTwoToneColors = A;
var M = O;
function P(e) {
  var t = E(e);
  var r = (0, i.Z)(t, 2);
  var n = r[0];
  var o = r[1];
  return M.setTwoToneColors({
    primaryColor: n,
    secondaryColor: o
  });
}
function q() {
  var e = M.getTwoToneColors();
  if (e.calculated) {
    return [e.primaryColor, e.secondaryColor];
  } else {
    return e.primaryColor;
  }
}
var N = ["className", "icon", "spin", "rotate", "tabIndex", "onClick", "twoToneColor"];
P("#1890ff");
var R = s.forwardRef(function (e, t) {
  var r = e.className;
  var u = e.icon;
  var p = e.spin;
  var d = e.rotate;
  var f = e.tabIndex;
  var g = e.onClick;
  var m = e.twoToneColor;
  var v = (0, a.Z)(e, N);
  var y = s.useContext(c.Z);
  var h = y.prefixCls;
  var b = h === undefined ? "anticon" : h;
  var w = y.rootClassName;
  var x = l(w, b, (0, o.Z)((0, o.Z)({}, `${b}-${u.name}`, !!u.name), `${b}-spin`, !!p || u.name === "loading"), r);
  var k = f;
  if (k === undefined && g) {
    k = -1;
  }
  var S = d ? {
    msTransform: `rotate(${d}deg)`,
    transform: `rotate(${d}deg)`
  } : undefined;
  var T = E(m);
  var C = (0, i.Z)(T, 2);
  var A = C[0];
  var _ = C[1];
  return s.createElement("span", (0, n.Z)((0, n.Z)({
    role: "img",
    "aria-label": u.name
  }, v), {}, {
    ref: t,
    tabIndex: k,
    onClick: g,
    className: x
  }), s.createElement(M, {
    icon: u,
    primaryColor: A,
    secondaryColor: _,
    style: S
  }));
});
R.displayName = "AntdIcon";
R.getTwoToneColor = q;
R.setTwoToneColor = P;
var I = R;
};
