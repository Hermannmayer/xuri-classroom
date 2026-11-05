// webpack module 77333 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Gs: function () {
    return d;
  },
  h4: function () {
    return y;
  },
  $_: function () {
    return h;
  },
  VY: function () {
    return b;
  }
});
var n = require("./66439.js");
var i = require("./21487.js");
var o = require("./23874.js");
var a = require("./34256.js");
var s = require("./38399.js");
var u = s;
var l = require("./59496.js");
var c = require("./52520.js");
function p(e, t) {
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
var d = l.createContext({
  siderHook: {
    addSider: function () {
      return null;
    },
    removeSider: function () {
      return null;
    }
  }
});
function f(e) {
  var t = e.suffixCls;
  var r = e.tagName;
  e.displayName;
  return function (e) {
    var n = l.forwardRef(function (n, i) {
      var o = l.useContext(c.E_);
      var s = o.getPrefixCls;
      var u = n.prefixCls;
      var p = s(t, u);
      return l.createElement(e, (0, a.Z)({
        ref: i,
        prefixCls: p,
        tagName: r
      }, n));
    });
    return n;
  };
}
var g = l.forwardRef(function (e, t) {
  var r = e.prefixCls;
  var n = e.className;
  var i = e.children;
  var o = e.tagName;
  var s = p(e, ["prefixCls", "className", "children", "tagName"]);
  var c = u(r, n);
  return l.createElement(o, (0, a.Z)((0, a.Z)({
    className: c
  }, s), {
    ref: t
  }), i);
});
var m = l.forwardRef(function (e, t) {
  var r = l.useContext(c.E_);
  var s = r.direction;
  var f = l.useState([]);
  var g = (0, o.Z)(f, 2);
  var m = g[0];
  var v = g[1];
  var y = e.prefixCls;
  var h = e.className;
  var b = e.children;
  var w = e.hasSider;
  var x = e.tagName;
  var E = p(e, ["prefixCls", "className", "children", "hasSider", "tagName"]);
  var k = u(y, (0, i.Z)((0, i.Z)({}, `${y}-has-sider`, typeof w === "boolean" ? w : m.length > 0), `${y}-rtl`, s === "rtl"), h);
  var S = l.useMemo(function () {
    return {
      siderHook: {
        addSider: function (e) {
          v(function (t) {
            return [].concat((0, n.Z)(t), [e]);
          });
        },
        removeSider: function (e) {
          v(function (t) {
            return t.filter(function (t) {
              return t !== e;
            });
          });
        }
      }
    };
  }, []);
  return l.createElement(d.Provider, {
    value: S
  }, l.createElement(x, (0, a.Z)({
    ref: t,
    className: k
  }, E), b));
});
var v = f({
  suffixCls: "layout",
  tagName: "section",
  displayName: "Layout"
})(m);
var y = f({
  suffixCls: "layout-header",
  tagName: "header",
  displayName: "Header"
})(g);
var h = f({
  suffixCls: "layout-footer",
  tagName: "footer",
  displayName: "Footer"
})(g);
var b = f({
  suffixCls: "layout-content",
  tagName: "main",
  displayName: "Content"
})(g);
exports.ZP = v;
};
