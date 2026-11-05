// webpack module 30638 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertLegacyProps = _;
exports.default = undefined;
var o = i(require("./90585.js"));
var a = i(require("./14389.js"));
var s = i(require("./49277.js"));
var u = i(require("./28004.js"));
var l = i(require("./38399.js"));
var c = i(require("./44653.js"));
var p = n(require("./59496.js"));
var d = require("./96583.js");
var f = i(require("./73965.js"));
var g = i(require("./45636.js"));
var m = require("./44624.js");
var v = require("./26701.js");
var y = require("./32543.js");
i(require("./2410.js"));
var h = i(require("./17959.js"));
var b = n(require("./86275.js"));
var w = i(require("./46871.js"));
function x(e, t) {
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
var E = /^[\u4e00-\u9fa5]{2}$/;
var k = E.test.bind(E);
function S(e) {
  return typeof e === "string";
}
function T(e) {
  return e === "text" || e === "link";
}
function C(e, t) {
  if (e !== null && e !== undefined) {
    var r = t ? " " : "";
    if (typeof e !== "string" && typeof e !== "number" && S(e.type) && k(e.props.children)) {
      return (0, v.cloneElement)(e, {
        children: e.props.children.split("").join(r)
      });
    } else if (typeof e === "string") {
      if (k(e)) {
        return p.createElement("span", null, e.split("").join(r));
      } else {
        return p.createElement("span", null, e);
      }
    } else if ((0, v.isFragment)(e)) {
      return p.createElement("span", null, e);
    } else {
      return e;
    }
  }
}
function A(e, t) {
  var r = false;
  var n = [];
  p.Children.forEach(e, function (e) {
    var t = (0, u.default)(e);
    var i = t === "string" || t === "number";
    if (r && i) {
      var o = n.length - 1;
      var a = n[o];
      n[o] = `${a}${e}`;
    } else {
      n.push(e);
    }
    r = i;
  });
  return p.Children.map(n, function (e) {
    return C(e, t);
  });
}
(0, y.tuple)("default", "primary", "ghost", "dashed", "link", "text");
(0, y.tuple)("default", "circle", "round");
(0, y.tuple)("submit", "button", "reset");
function _(e) {
  if (e === "danger") {
    return {
      danger: true
    };
  } else {
    return {
      type: e
    };
  }
}
function O(e, t) {
  var r;
  var n = e.loading;
  var i = n !== undefined && n;
  var u = e.prefixCls;
  var v = e.type;
  var y = v === undefined ? "default" : v;
  var E = e.danger;
  var S = e.shape;
  var C = S === undefined ? "default" : S;
  var _ = e.size;
  var O = e.disabled;
  var M = e.className;
  var P = e.children;
  var q = e.icon;
  var N = e.ghost;
  var R = N !== undefined && N;
  var I = e.block;
  var j = I !== undefined && I;
  var D = e.htmlType;
  var L = D === undefined ? "button" : D;
  var F = x(e, ["loading", "prefixCls", "type", "danger", "shape", "size", "disabled", "className", "children", "icon", "ghost", "block", "htmlType"]);
  var Z = p.useContext(g.default);
  var z = p.useContext(f.default);
  var U = O ?? z;
  var B = p.useContext(b.GroupSizeContext);
  var V = p.useState(!!i);
  var H = (0, s.default)(V, 2);
  var W = H[0];
  var Y = H[1];
  var Q = p.useState(false);
  var $ = (0, s.default)(Q, 2);
  var G = $[0];
  var K = $[1];
  var J = p.useContext(d.ConfigContext);
  var X = J.getPrefixCls;
  var ee = J.autoInsertSpaceInButton;
  var te = J.direction;
  var re = t || p.createRef();
  function ne() {
    return p.Children.count(P) === 1 && !q && !T(y);
  }
  function ie() {
    if (re && re.current && ee !== false) {
      var e = re.current.textContent;
      if (ne() && k(e)) {
        if (!G) {
          K(true);
        }
      } else if (G) {
        K(false);
      }
    }
  }
  var oe = typeof i === "boolean" ? i : i?.delay || true;
  p.useEffect(function () {
    var e = null;
    if (typeof oe === "number") {
      e = window.setTimeout(function () {
        e = null;
        Y(oe);
      }, oe);
    } else {
      Y(oe);
    }
    return function () {
      if (e) {
        window.clearTimeout(e);
        e = null;
      }
    };
  }, [oe]);
  p.useEffect(ie, [re]);
  function ae(t) {
    var r = e.onClick;
    if (W || U) {
      t.preventDefault();
    } else if (r !== null && r !== undefined) {
      r(t);
    }
  }
  var se = X("btn", u);
  var ue = ee !== false;
  var le = (0, m.useCompactItemContext)(se, te);
  var ce = le.compactSize;
  var pe = le.compactItemClassnames;
  var de = {
    large: "lg",
    small: "sm",
    middle: undefined
  };
  var fe = ce || B || _ || Z;
  var ge = fe && de[fe] || "";
  var me = W ? "loading" : q;
  var ve = (0, c.default)(F, ["navigate"]);
  var ye = (0, l.default)(se, (r = {}, (0, a.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)((0, a.default)(r, `${se}-${C}`, C !== "default" && C), `${se}-${y}`, y), `${se}-${ge}`, ge), `${se}-icon-only`, !P && P !== 0 && !!me), `${se}-background-ghost`, R && !T(y)), `${se}-loading`, W), `${se}-two-chinese-chars`, G && ue && !W), `${se}-block`, j), `${se}-dangerous`, !!E), `${se}-rtl`, te === "rtl"), (0, a.default)(r, `${se}-disabled`, ve.href !== undefined && U)), pe, M);
  var he = q && !W ? q : p.createElement(w.default, {
    existIcon: !!q,
    prefixCls: se,
    loading: !!W
  });
  var be = P || P === 0 ? A(P, ne() && ue) : null;
  if (ve.href !== undefined) {
    return p.createElement("a", (0, o.default)({}, ve, {
      className: ye,
      onClick: ae,
      ref: re
    }), he, be);
  }
  var we = p.createElement("button", (0, o.default)({}, F, {
    type: L,
    className: ye,
    onClick: ae,
    disabled: U,
    ref: re
  }), he, be);
  if (T(y)) {
    return we;
  } else {
    return p.createElement(h.default, {
      disabled: !!W
    }, we);
  }
}
var M = p.forwardRef(O);
M.Group = b.default;
M.__ANT_BUTTON = true;
exports.default = M;
};
