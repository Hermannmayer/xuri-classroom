// webpack module 97829 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js");
var i = require("./48932.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.warning = d;
exports.isIconDefinition = f;
exports.normalizeAttrs = g;
exports.generate = m;
exports.getSecondaryColor = v;
exports.normalizeTwoToneColors = y;
exports.useInsertStyles = exports.iconStyles = exports.svgBaseProps = undefined;
var o = i(require("./38524.js"));
var a = i(require("./28004.js"));
var s = require("./56088.js");
var u = n(require("./59496.js"));
var l = i(require("./69721.js"));
var c = require("./16732.js");
var p = i(require("./58951.js"));
function d(e, t) {
  (0, l.default)(e, `[@ant-design/icons] ${t}`);
}
function f(e) {
  return (0, a.default)(e) === "object" && typeof e.name === "string" && typeof e.theme === "string" && ((0, a.default)(e.icon) === "object" || typeof e.icon === "function");
}
function g(e = {}) {
  return Object.keys(e).reduce(function (t, r) {
    var n = e[r];
    switch (r) {
      case "class":
        t.className = n;
        delete t.class;
        break;
      default:
        t[r] = n;
    }
    return t;
  }, {});
}
function m(e, t, r) {
  if (r) {
    return u.default.createElement(e.tag, (0, o.default)((0, o.default)({
      key: t
    }, g(e.attrs)), r), (e.children || []).map(function (r, n) {
      return m(r, `${t}-${e.tag}-${n}`);
    }));
  } else {
    return u.default.createElement(e.tag, (0, o.default)({
      key: t
    }, g(e.attrs)), (e.children || []).map(function (r, n) {
      return m(r, `${t}-${e.tag}-${n}`);
    }));
  }
}
function v(e) {
  return (0, s.generate)(e)[0];
}
function y(e) {
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
var h = {
  width: "1em",
  height: "1em",
  fill: "currentColor",
  "aria-hidden": "true",
  focusable: "false"
};
exports.svgBaseProps = h;
var b = "\n.anticon {\n  display: inline-block;\n  color: inherit;\n  font-style: normal;\n  line-height: 0;\n  text-align: center;\n  text-transform: none;\n  vertical-align: -0.125em;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.anticon > * {\n  line-height: 1;\n}\n\n.anticon svg {\n  display: inline-block;\n}\n\n.anticon::before {\n  display: none;\n}\n\n.anticon .anticon-icon {\n  display: block;\n}\n\n.anticon[tabindex] {\n  cursor: pointer;\n}\n\n.anticon-spin::before,\n.anticon-spin {\n  display: inline-block;\n  -webkit-animation: loadingCircle 1s infinite linear;\n  animation: loadingCircle 1s infinite linear;\n}\n\n@-webkit-keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n\n@keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n";
exports.iconStyles = b;
function w(e = b) {
  var t = (0, u.useContext)(p.default);
  var r = t.csp;
  (0, u.useEffect)(function () {
    (0, c.updateCSS)(e, "@ant-design-icons", {
      prepend: true,
      csp: r
    });
  }, []);
}
exports.useInsertStyles = w;
};
