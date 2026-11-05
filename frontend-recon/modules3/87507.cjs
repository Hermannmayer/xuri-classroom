// webpack module 87507 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = C;
var o = i(require("./14389.js"));
var a = i(require("./90585.js"));
var s = i(require("./90565.js"));
var u = i(require("./68993.js"));
var l = i(require("./77468.js"));
var c = i(require("./20496.js"));
var p = i(require("./38399.js"));
var d = require("./33289.js");
var f = n(require("./59496.js"));
var g = f;
var m = require("./25030.js");
var v = require("./96583.js");
var y = i(require("./73965.js"));
var h = i(require("./45636.js"));
var b = require("./40076.js");
var w = require("./44624.js");
var x = i(require("./61727.js"));
var E = require("./56747.js");
var k = i(require("./79169.js"));
var S = require("./2679.js");
i(require("./2410.js"));
function T(e, t) {
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
function C(e) {
  var t = (0, f.forwardRef)(function (t, r) {
    var n = t.prefixCls;
    var i = t.getPopupContainer;
    var C = t.className;
    var A = t.placement;
    var _ = t.size;
    var O = t.disabled;
    var M = t.bordered;
    var P = M === undefined || M;
    var q = t.placeholder;
    var N = t.popupClassName;
    var R = t.dropdownClassName;
    var I = t.status;
    var j = T(t, ["prefixCls", "getPopupContainer", "className", "placement", "size", "disabled", "bordered", "placeholder", "popupClassName", "dropdownClassName", "status"]);
    var D = g.useRef(null);
    var L = (0, f.useContext)(v.ConfigContext);
    var F = L.getPrefixCls;
    var Z = L.direction;
    var z = L.getPopupContainer;
    var U = F("picker", n);
    var B = (0, w.useCompactItemContext)(U, Z);
    var V = B.compactSize;
    var H = B.compactItemClassnames;
    var W = t.format;
    var Y = t.showTime;
    var Q = t.picker;
    var $ = F();
    var G = {};
    G = (0, a.default)((0, a.default)((0, a.default)({}, G), Y ? (0, m.getTimeProps)((0, a.default)({
      format: W,
      picker: Q
    }, Y)) : {}), Q === "time" ? (0, m.getTimeProps)((0, a.default)((0, a.default)({
      format: W
    }, t), {
      picker: Q
    })) : {});
    var K = g.useContext(h.default);
    var J = V || _ || K;
    var X = g.useContext(y.default);
    var ee = O ?? X;
    var te = (0, f.useContext)(b.FormItemInputContext);
    var re = te.hasFeedback;
    var ne = te.status;
    var ie = te.feedbackIcon;
    var oe = g.createElement(g.Fragment, null, Q === "time" ? g.createElement(u.default, null) : g.createElement(s.default, null), re && ie);
    (0, f.useImperativeHandle)(r, function () {
      return {
        focus: function () {
          var e;
          if ((e = D.current) === null || e === undefined) {
            return undefined;
          } else {
            return e.focus();
          }
        },
        blur: function () {
          var e;
          if ((e = D.current) === null || e === undefined) {
            return undefined;
          } else {
            return e.blur();
          }
        }
      };
    });
    return g.createElement(x.default, {
      componentName: "DatePicker",
      defaultLocale: k.default
    }, function (r) {
      var n = (0, a.default)((0, a.default)({}, r), t.locale);
      return g.createElement(d.RangePicker, (0, a.default)({
        separator: g.createElement("span", {
          "aria-label": "to",
          className: `${U}-separator`
        }, g.createElement(c.default, null)),
        disabled: ee,
        ref: D,
        dropdownAlign: (0, S.transPlacement2DropdownAlign)(Z, A),
        placeholder: (0, S.getRangePlaceholder)(Q, n, q),
        suffixIcon: oe,
        clearIcon: g.createElement(l.default, null),
        prevIcon: g.createElement("span", {
          className: `${U}-prev-icon`
        }),
        nextIcon: g.createElement("span", {
          className: `${U}-next-icon`
        }),
        superPrevIcon: g.createElement("span", {
          className: `${U}-super-prev-icon`
        }),
        superNextIcon: g.createElement("span", {
          className: `${U}-super-next-icon`
        }),
        allowClear: true,
        transitionName: `${$}-slide-up`
      }, j, G, {
        className: (0, p.default)((0, o.default)((0, o.default)({}, `${U}-${J}`, J), `${U}-borderless`, !P), (0, E.getStatusClassNames)(U, (0, E.getMergedStatus)(ne, I), re), H, C),
        locale: n.lang,
        prefixCls: U,
        getPopupContainer: i || z,
        generateConfig: e,
        components: m.Components,
        direction: Z,
        dropdownClassName: N || R
      }));
    });
  });
  return t;
}
};
