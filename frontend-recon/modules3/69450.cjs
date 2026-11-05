// webpack module 69450 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  default: function () {
    return F;
  },
  getInstance: function () {
    return L;
  }
});
var n = require("92145");
var i = require("34256");
var o = require("21487");
var a = require("34099");
var s = require("91820");
var u = require("95237");
var l = require("91984");
var c = require("50746");
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
    var n = null;
    var o = {
      add: function (e, t) {
        if (n !== null && n !== undefined) {
          n.component.add(e, t);
        }
      }
    };
    var a = (0, y.Z)(o);
    var s = (0, v.Z)(a, 2);
    var u = s[0];
    var l = s[1];
    function c(o) {
      var a = o.prefixCls;
      var s = r("notification", a);
      e((0, i.Z)((0, i.Z)({}, o), {
        prefixCls: s
      }), function (e) {
        var r = e.prefixCls;
        var i = e.instance;
        n = i;
        u(t(o, r));
      });
    }
    var p = g.useRef({});
    p.current.open = c;
    ["success", "info", "warning", "error"].forEach(function (e) {
      p.current[e] = function (t) {
        return p.current.open((0, i.Z)((0, i.Z)({}, t), {
          type: e
        }));
      };
    });
    return [p.current, g.createElement(h.C, {
      key: "holder"
    }, function (e) {
      r = e.getPrefixCls;
      return l;
    })];
  }
  return r;
}
var w;
var x;
var E;
function k(e, t, r, n) {
  function i(e) {
    if (e instanceof r) {
      return e;
    } else {
      return new r(function (t) {
        t(e);
      });
    }
  }
  return new (r ||= Promise)(function (r, o) {
    function a(e) {
      try {
        u(n.next(e));
      } catch (t) {
        o(t);
      }
    }
    function s(e) {
      try {
        u(n.throw(e));
      } catch (t) {
        o(t);
      }
    }
    function u(e) {
      if (e.done) {
        r(e.value);
      } else {
        i(e.value).then(a, s);
      }
    }
    u((n = n.apply(e, t || [])).next());
  });
}
var S = {};
var T = 4.5;
var C = 24;
var A = 24;
var _ = "";
var O = "topRight";
var M = false;
function P(e) {
  var t = e.duration;
  var r = e.placement;
  var n = e.bottom;
  var i = e.top;
  var o = e.getContainer;
  var a = e.closeIcon;
  var s = e.prefixCls;
  if (s !== undefined) {
    _ = s;
  }
  if (t !== undefined) {
    T = t;
  }
  if (r !== undefined) {
    O = r;
  } else if (e.rtl) {
    O = "topLeft";
  }
  if (n !== undefined) {
    A = n;
  }
  if (i !== undefined) {
    C = i;
  }
  if (o !== undefined) {
    w = o;
  }
  if (a !== undefined) {
    x = a;
  }
  if (e.rtl !== undefined) {
    M = e.rtl;
  }
  if (e.maxCount !== undefined) {
    E = e.maxCount;
  }
}
function q(e) {
  var t;
  var r = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : C;
  var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : A;
  switch (e) {
    case "top":
      t = {
        left: "50%",
        transform: "translateX(-50%)",
        right: "auto",
        top: r,
        bottom: "auto"
      };
      break;
    case "topLeft":
      t = {
        left: 0,
        top: r,
        bottom: "auto"
      };
      break;
    case "topRight":
      t = {
        right: 0,
        top: r,
        bottom: "auto"
      };
      break;
    case "bottom":
      t = {
        left: "50%",
        transform: "translateX(-50%)",
        right: "auto",
        top: "auto",
        bottom: n
      };
      break;
    case "bottomLeft":
      t = {
        left: 0,
        top: "auto",
        bottom: n
      };
      break;
    default:
      t = {
        right: 0,
        top: "auto",
        bottom: n
      };
      break;
  }
  return t;
}
function N(e, t) {
  var r = e.placement;
  var n = r === undefined ? O : r;
  var i = e.top;
  var a = e.bottom;
  var s = e.getContainer;
  var u = s === undefined ? w : s;
  var l = e.prefixCls;
  var c = (0, m.w6)();
  var p = c.getPrefixCls;
  var g = c.getIconPrefixCls;
  var v = p("notification", l || _);
  var y = g();
  var h = `${v}-${n}`;
  var b = S[h];
  if (b) {
    Promise.resolve(b).then(function (e) {
      t({
        prefixCls: `${v}-notice`,
        iconPrefixCls: y,
        instance: e
      });
    });
  } else {
    var x = d(`${v}-${n}`, (0, o.Z)({}, `${v}-rtl`, M === true));
    S[h] = new Promise(function (e) {
      f.default.newInstance({
        prefixCls: v,
        className: x,
        style: q(n, i, a),
        getContainer: u,
        maxCount: E
      }, function (r) {
        e(r);
        t({
          prefixCls: `${v}-notice`,
          iconPrefixCls: y,
          instance: r
        });
      });
    });
  }
}
var R = {
  success: a.Z,
  info: c.Z,
  error: s.Z,
  warning: l.Z
};
function I(e, t, r) {
  var n = e.duration;
  var i = e.icon;
  var a = e.type;
  var s = e.description;
  var l = e.message;
  var c = e.btn;
  var p = e.onClose;
  var f = e.onClick;
  var v = e.key;
  var y = e.style;
  var h = e.className;
  var b = e.closeIcon;
  var w = b === undefined ? x : b;
  var E = e.props;
  var k = n === undefined ? T : n;
  var S = null;
  if (i) {
    S = g.createElement("span", {
      className: `${t}-icon`
    }, e.icon);
  } else if (a) {
    S = g.createElement(R[a] || null, {
      className: `${t}-icon ${t}-icon-${a}`
    });
  }
  var C = typeof w === "undefined" ? g.createElement("span", {
    className: `${t}-close-x`
  }, g.createElement(u.Z, {
    className: `${t}-close-icon`
  })) : w;
  var A = !s && S ? g.createElement("span", {
    className: `${t}-message-single-line-auto-margin`
  }) : null;
  return {
    content: g.createElement(m.ZP, {
      iconPrefixCls: r
    }, g.createElement("div", {
      className: S ? `${t}-with-icon` : "",
      role: "alert"
    }, S, g.createElement("div", {
      className: `${t}-message`
    }, A, l), g.createElement("div", {
      className: `${t}-description`
    }, s), c ? g.createElement("span", {
      className: `${t}-btn`
    }, c) : null)),
    duration: k,
    closable: true,
    closeIcon: C,
    onClose: p,
    onClick: f,
    key: v,
    style: y || {},
    className: d(h, (0, o.Z)({}, `${t}-${a}`, !!a)),
    props: E
  };
}
function j(e) {
  N(e, function (t) {
    var r = t.prefixCls;
    var n = t.iconPrefixCls;
    var i = t.instance;
    i.notice(I(e, r, n));
  });
}
var D = {
  open: j,
  close: function (e) {
    Object.keys(S).forEach(function (t) {
      return Promise.resolve(S[t]).then(function (t) {
        t.removeNotice(e);
      });
    });
  },
  config: P,
  destroy: function () {
    Object.keys(S).forEach(function (e) {
      Promise.resolve(S[e]).then(function (e) {
        e.destroy();
      });
      delete S[e];
    });
  }
};
["success", "info", "warning", "error"].forEach(function (e) {
  D[e] = function (t) {
    return D.open((0, i.Z)((0, i.Z)({}, t), {
      type: e
    }));
  };
});
D.warn = D.warning;
D.useNotification = b(N, I);
function L(e) {
  return k(undefined, undefined, undefined, (0, n.Z)().mark(function e() {
    return (0, n.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            return e.abrupt("return", null);
          case 1:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
}
var F = D;
};
