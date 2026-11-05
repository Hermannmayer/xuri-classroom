// webpack module 80283 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
var i = require("./28004.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generate = h;
exports.getSecondaryColor = b;
exports.iconStyles = undefined;
exports.isIconDefinition = v;
exports.normalizeAttrs = y;
exports.normalizeTwoToneColors = w;
exports.useInsertStyles = exports.svgBaseProps = undefined;
exports.warning = m;
var o = n(require("./38524.js"));
var a = n(require("./28004.js"));
var s = require("./56088.js");
var u = g(require("./59496.js"));
var l = n(require("./69721.js"));
var c = require("./16732.js");
var p = n(require("./2890.js"));
var d = n(require("./67186.js"));
function f(e) {
  if (typeof WeakMap != "function") {
    return null;
  }
  var t = new WeakMap();
  var r = new WeakMap();
  return (f = function (e) {
    if (e) {
      return r;
    } else {
      return t;
    }
  })(e);
}
function g(e, t) {
  if (!t && e && e.__esModule) {
    return e;
  }
  if (e === null || i(e) != "object" && typeof e != "function") {
    return {
      default: e
    };
  }
  var r = f(t);
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
function m(e, t) {
  (0, l.default)(e, `[@ant-design/icons] ${t}`);
}
function v(e) {
  return (0, a.default)(e) === "object" && typeof e.name === "string" && typeof e.theme === "string" && ((0, a.default)(e.icon) === "object" || typeof e.icon === "function");
}
function y(e = {}) {
  return Object.keys(e).reduce(function (t, r) {
    var n = e[r];
    switch (r) {
      case "class":
        t.className = n;
        delete t.class;
        break;
      default:
        delete t[r];
        t[(0, d.default)(r)] = n;
    }
    return t;
  }, {});
}
function h(e, t, r) {
  if (r) {
    return u.default.createElement(e.tag, (0, o.default)((0, o.default)({
      key: t
    }, y(e.attrs)), r), (e.children || []).map(function (r, n) {
      return h(r, `${t}-${e.tag}-${n}`);
    }));
  } else {
    return u.default.createElement(e.tag, (0, o.default)({
      key: t
    }, y(e.attrs)), (e.children || []).map(function (r, n) {
      return h(r, `${t}-${e.tag}-${n}`);
    }));
  }
}
function b(e) {
  return (0, s.generate)(e)[0];
}
function w(e) {
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
exports.svgBaseProps = {
  width: "1em",
  height: "1em",
  fill: "currentColor",
  "aria-hidden": "true",
  focusable: "false"
};
var x = exports.iconStyles = "\n.anticon {\n  display: inline-flex;\n  alignItems: center;\n  color: inherit;\n  font-style: normal;\n  line-height: 0;\n  text-align: center;\n  text-transform: none;\n  vertical-align: -0.125em;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.anticon > * {\n  line-height: 1;\n}\n\n.anticon svg {\n  display: inline-block;\n}\n\n.anticon::before {\n  display: none;\n}\n\n.anticon .anticon-icon {\n  display: block;\n}\n\n.anticon[tabindex] {\n  cursor: pointer;\n}\n\n.anticon-spin::before,\n.anticon-spin {\n  display: inline-block;\n  -webkit-animation: loadingCircle 1s infinite linear;\n  animation: loadingCircle 1s infinite linear;\n}\n\n@-webkit-keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n\n@keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n";
exports.useInsertStyles = function (e = x) {
  var t = (0, u.useContext)(p.default);
  var r = t.csp;
  (0, u.useEffect)(function () {
    (0, c.updateCSS)(e, "@ant-design-icons", {
      prepend: true,
      csp: r
    });
  }, []);
};
};
