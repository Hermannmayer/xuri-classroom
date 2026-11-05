// webpack module 71222 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o = i(require("./14389.js"));
var a = i(require("./90585.js"));
var s = i(require("./49277.js"));
var u = i(require("./66401.js"));
var l = i(require("./38399.js"));
var c = i(require("./44653.js"));
var p = n(require("./59496.js"));
var d = require("./96583.js");
var f = require("./68398.js");
var g = i(require("./17959.js"));
i(require("./2410.js"));
var m = i(require("./21012.js"));
function v(e, t) {
  var r = {};
  for (var n in e) {
    if (Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0) {
      r[n] = e[n];
    }
  }
  if (e != null && typeof Object.getOwnPropertySymbols === "function") {
    var i = 0;
    for (n = Object.getOwnPropertySymbols(e); i < n.length; i++) {
      if (t.indexOf(n[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[i])) {
        r[n[i]] = e[n[i]];
      }
    }
  }
  return r;
}
var y = new RegExp(`^(${f.PresetColorTypes.join("|")})(-inverse)?\$`);
var h = new RegExp(`^(${f.PresetStatusColorTypes.join("|")})\$`);
function b(e, t) {
  var r = e.prefixCls;
  var n = e.className;
  var i = e.style;
  var f = e.children;
  var m = e.icon;
  var b = e.color;
  var w = e.onClose;
  var x = e.closeIcon;
  var E = e.closable;
  var k = E !== undefined && E;
  var S = v(e, ["prefixCls", "className", "style", "children", "icon", "color", "onClose", "closeIcon", "closable"]);
  var T = p.useContext(d.ConfigContext);
  var C = T.getPrefixCls;
  var A = T.direction;
  var _ = p.useState(true);
  var O = (0, s.default)(_, 2);
  var M = O[0];
  var P = O[1];
  p.useEffect(function () {
    if ("visible" in S) {
      P(S.visible);
    }
  }, [S.visible]);
  function q() {
    return !!b && (y.test(b) || h.test(b));
  }
  var N = (0, a.default)({
    backgroundColor: b && !q() ? b : undefined
  }, i);
  var R = q();
  var I = C("tag", r);
  var j = (0, l.default)(I, (0, o.default)((0, o.default)((0, o.default)((0, o.default)({}, `${I}-${b}`, R), `${I}-has-color`, b && !R), `${I}-hidden`, !M), `${I}-rtl`, A === "rtl"), n);
  function D(e) {
    e.stopPropagation();
    if (w !== null && w !== undefined) {
      w(e);
    }
    if (!e.defaultPrevented && !("visible" in S)) {
      P(false);
    }
  }
  function L() {
    if (k) {
      if (x) {
        return p.createElement("span", {
          className: `${I}-close-icon`,
          onClick: D
        }, x);
      } else {
        return p.createElement(u.default, {
          className: `${I}-close-icon`,
          onClick: D
        });
      }
    } else {
      return null;
    }
  }
  var F = "onClick" in S || f && f.type === "a";
  var Z = (0, c.default)(S, ["visible"]);
  var z = m || null;
  var U = z ? p.createElement(p.Fragment, null, z, p.createElement("span", null, f)) : f;
  var B = p.createElement("span", (0, a.default)({}, Z, {
    ref: t,
    className: j,
    style: N
  }), U, L());
  if (F) {
    return p.createElement(g.default, null, B);
  } else {
    return B;
  }
}
var w = p.forwardRef(b);
w.CheckableTag = m.default;
exports.default = w;
};
