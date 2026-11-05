// webpack module 16179 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  attachTypeApi: function () {
    return L;
  },
  default: function () {
    return Z;
  },
  getInstance: function () {
    return F;
  },
  getKeyThenIncreaseKey: function () {
    return O;
  },
  typeList: function () {
    return N;
  }
});
var n;
var i = require("34256");
var o = require("21487");
var a = require("53070");
var s = require("81741");
var u = require("98281");
var l = require("67950");
var c = require("89743");
var p = require("38399");
var d = p;
var f = require("42723");
var g = require("59496");
var m = require("12708");
var v = require("23874");
var y = require("99311");
var h = require("52520");
function b(e, t) {
  function r() {
    var r;
    var n;
    var o = null;
    var a = {
      add: function (e, t) {
        if (o !== null && o !== undefined) {
          o.component.add(e, t);
        }
      }
    };
    var s = (0, y.Z)(a);
    var u = (0, v.Z)(s, 2);
    var l = u[0];
    var c = u[1];
    function p(a) {
      var s = a.prefixCls;
      var u = r("message", s);
      var c = r();
      var p = a.key || O();
      var d = new Promise(function (r) {
        function s() {
          if (typeof a.onClose === "function") {
            a.onClose();
          }
          return r(true);
        }
        e((0, i.Z)((0, i.Z)({}, a), {
          prefixCls: u,
          rootPrefixCls: c,
          getPopupContainer: n
        }), function (e) {
          var r = e.prefixCls;
          var n = e.instance;
          o = n;
          l(t((0, i.Z)((0, i.Z)({}, a), {
            key: p,
            onClose: s
          }), r));
        });
      });
      function f() {
        if (o) {
          o.removeNotice(p);
        }
      }
      f.then = function (e, t) {
        return d.then(e, t);
      };
      f.promise = d;
      return f;
    }
    var d = g.useRef({});
    d.current.open = p;
    N.forEach(function (e) {
      return L(d.current, e);
    });
    return [d.current, g.createElement(h.C, {
      key: "holder"
    }, function (e) {
      r = e.getPrefixCls;
      n = e.getPopupContainer;
      return c;
    })];
  }
  return r;
}
var w;
var x;
var E;
var k = 3;
var S = 1;
var T = "";
var C = "move-up";
var A = false;
var _ = false;
function O() {
  return S++;
}
function M(e) {
  if (e.top !== undefined) {
    w = e.top;
    n = null;
  }
  if (e.duration !== undefined) {
    k = e.duration;
  }
  if (e.prefixCls !== undefined) {
    T = e.prefixCls;
  }
  if (e.getContainer !== undefined) {
    x = e.getContainer;
    n = null;
  }
  if (e.transitionName !== undefined) {
    C = e.transitionName;
    n = null;
    A = true;
  }
  if (e.maxCount !== undefined) {
    E = e.maxCount;
    n = null;
  }
  if (e.rtl !== undefined) {
    _ = e.rtl;
  }
}
function P(e, t) {
  var r = e.prefixCls;
  var i = e.getPopupContainer;
  var o = (0, m.w6)();
  var a = o.getPrefixCls;
  var s = o.getRootPrefixCls;
  var u = o.getIconPrefixCls;
  var l = a("message", r || T);
  var c = s(e.rootPrefixCls, l);
  var p = u();
  if (n) {
    t({
      prefixCls: l,
      rootPrefixCls: c,
      iconPrefixCls: p,
      instance: n
    });
  } else {
    var d = {
      prefixCls: l,
      transitionName: A ? C : `${c}-${C}`,
      style: {
        top: w
      },
      getContainer: x || i,
      maxCount: E
    };
    f.default.newInstance(d, function (e) {
      if (n) {
        t({
          prefixCls: l,
          rootPrefixCls: c,
          iconPrefixCls: p,
          instance: n
        });
      } else {
        n = e;
        t({
          prefixCls: l,
          rootPrefixCls: c,
          iconPrefixCls: p,
          instance: e
        });
      }
    });
  }
}
var q = {
  info: l.Z,
  success: a.Z,
  error: s.Z,
  warning: u.Z,
  loading: c.Z
};
var N = Object.keys(q);
function R(e, t, r) {
  var n = e.duration !== undefined ? e.duration : k;
  var i = q[e.type];
  var a = d(`${t}-custom-content`, (0, o.Z)((0, o.Z)({}, `${t}-${e.type}`, e.type), `${t}-rtl`, _ === true));
  return {
    key: e.key,
    duration: n,
    style: e.style || {},
    className: e.className,
    content: g.createElement(m.ZP, {
      iconPrefixCls: r
    }, g.createElement("div", {
      className: a
    }, e.icon || i && g.createElement(i, null), g.createElement("span", null, e.content))),
    onClose: e.onClose,
    onClick: e.onClick
  };
}
function I(e) {
  var t = e.key || O();
  var r = new Promise(function (r) {
    function n() {
      if (typeof e.onClose === "function") {
        e.onClose();
      }
      return r(true);
    }
    P(e, function (r) {
      var o = r.prefixCls;
      var a = r.iconPrefixCls;
      var s = r.instance;
      s.notice(R((0, i.Z)((0, i.Z)({}, e), {
        key: t,
        onClose: n
      }), o, a));
    });
  });
  function o() {
    var r;
    if (n) {
      n.removeNotice(t);
      if ((r = e.onClose) !== null && r !== undefined) {
        r.call(e);
      }
    }
  }
  o.then = function (e, t) {
    return r.then(e, t);
  };
  o.promise = r;
  return o;
}
function j(e) {
  return Object.prototype.toString.call(e) === "[object Object]" && !!e.content;
}
var D = {
  open: I,
  config: M,
  destroy: function (e) {
    if (n) {
      if (e) {
        var t = n;
        var r = t.removeNotice;
        r(e);
      } else {
        var i = n;
        var o = i.destroy;
        o();
        n = null;
      }
    }
  }
};
function L(e, t) {
  e[t] = function (r, n, o) {
    if (j(r)) {
      return e.open((0, i.Z)((0, i.Z)({}, r), {
        type: t
      }));
    } else {
      if (typeof n === "function") {
        o = n;
        n = undefined;
      }
      return e.open({
        content: r,
        duration: n,
        type: t,
        onClose: o
      });
    }
  };
}
N.forEach(function (e) {
  return L(D, e);
});
D.warn = D.warning;
D.useMessage = b(P, R);
function F() {
  return null;
}
var Z = D;
};
