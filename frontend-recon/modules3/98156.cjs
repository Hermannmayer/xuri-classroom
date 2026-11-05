// webpack module 98156 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getInstance = exports.default = undefined;
var o;
var a;
var s;
var u = i(require("./74534.js"));
var l = i(require("./90585.js"));
var c = i(require("./14389.js"));
var p = i(require("./54884.js"));
var d = i(require("./11282.js"));
var f = i(require("./66401.js"));
var g = i(require("./73918.js"));
var m = i(require("./37246.js"));
var v = i(require("./38399.js"));
var y = i(require("./42723.js"));
var h = n(require("./59496.js"));
var b = n(require("./96583.js"));
var w = i(require("./94228.js"));
function x(e, t, r, n) {
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
var E = {};
var k = 4.5;
var S = 24;
var T = 24;
var C = "";
var A = "topRight";
var _ = false;
function O(e) {
  var t = e.duration;
  var r = e.placement;
  var n = e.bottom;
  var i = e.top;
  var u = e.getContainer;
  var l = e.closeIcon;
  var c = e.prefixCls;
  if (c !== undefined) {
    C = c;
  }
  if (t !== undefined) {
    k = t;
  }
  if (r !== undefined) {
    A = r;
  } else if (e.rtl) {
    A = "topLeft";
  }
  if (n !== undefined) {
    T = n;
  }
  if (i !== undefined) {
    S = i;
  }
  if (u !== undefined) {
    o = u;
  }
  if (l !== undefined) {
    a = l;
  }
  if (e.rtl !== undefined) {
    _ = e.rtl;
  }
  if (e.maxCount !== undefined) {
    s = e.maxCount;
  }
}
function M(e) {
  var t;
  var r = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : S;
  var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : T;
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
function P(e, t) {
  var r = e.placement;
  var n = r === undefined ? A : r;
  var i = e.top;
  var a = e.bottom;
  var u = e.getContainer;
  var l = u === undefined ? o : u;
  var p = e.prefixCls;
  var d = (0, b.globalConfig)();
  var f = d.getPrefixCls;
  var g = d.getIconPrefixCls;
  var m = f("notification", p || C);
  var h = g();
  var w = `${m}-${n}`;
  var x = E[w];
  if (x) {
    Promise.resolve(x).then(function (e) {
      t({
        prefixCls: `${m}-notice`,
        iconPrefixCls: h,
        instance: e
      });
    });
  } else {
    var k = (0, v.default)(`${m}-${n}`, (0, c.default)({}, `${m}-rtl`, _ === true));
    E[w] = new Promise(function (e) {
      y.default.newInstance({
        prefixCls: m,
        className: k,
        style: M(n, i, a),
        getContainer: l,
        maxCount: s
      }, function (r) {
        e(r);
        t({
          prefixCls: `${m}-notice`,
          iconPrefixCls: h,
          instance: r
        });
      });
    });
  }
}
var q = {
  success: p.default,
  info: m.default,
  error: d.default,
  warning: g.default
};
function N(e, t, r) {
  var n = e.duration;
  var i = e.icon;
  var o = e.type;
  var s = e.description;
  var u = e.message;
  var l = e.btn;
  var p = e.onClose;
  var d = e.onClick;
  var g = e.key;
  var m = e.style;
  var y = e.className;
  var w = e.closeIcon;
  var x = w === undefined ? a : w;
  var E = e.props;
  var S = n === undefined ? k : n;
  var T = null;
  if (i) {
    T = h.createElement("span", {
      className: `${t}-icon`
    }, e.icon);
  } else if (o) {
    T = h.createElement(q[o] || null, {
      className: `${t}-icon ${t}-icon-${o}`
    });
  }
  var C = typeof x === "undefined" ? h.createElement("span", {
    className: `${t}-close-x`
  }, h.createElement(f.default, {
    className: `${t}-close-icon`
  })) : x;
  var A = !s && T ? h.createElement("span", {
    className: `${t}-message-single-line-auto-margin`
  }) : null;
  return {
    content: h.createElement(b.default, {
      iconPrefixCls: r
    }, h.createElement("div", {
      className: T ? `${t}-with-icon` : "",
      role: "alert"
    }, T, h.createElement("div", {
      className: `${t}-message`
    }, A, u), h.createElement("div", {
      className: `${t}-description`
    }, s), l ? h.createElement("span", {
      className: `${t}-btn`
    }, l) : null)),
    duration: S,
    closable: true,
    closeIcon: C,
    onClose: p,
    onClick: d,
    key: g,
    style: m || {},
    className: (0, v.default)(y, (0, c.default)({}, `${t}-${o}`, !!o)),
    props: E
  };
}
function R(e) {
  P(e, function (t) {
    var r = t.prefixCls;
    var n = t.iconPrefixCls;
    var i = t.instance;
    i.notice(N(e, r, n));
  });
}
var I = {
  open: R,
  close: function (e) {
    Object.keys(E).forEach(function (t) {
      return Promise.resolve(E[t]).then(function (t) {
        t.removeNotice(e);
      });
    });
  },
  config: O,
  destroy: function () {
    Object.keys(E).forEach(function (e) {
      Promise.resolve(E[e]).then(function (e) {
        e.destroy();
      });
      delete E[e];
    });
  }
};
["success", "info", "warning", "error"].forEach(function (e) {
  I[e] = function (t) {
    return I.open((0, l.default)((0, l.default)({}, t), {
      type: e
    }));
  };
});
I.warn = I.warning;
I.useNotification = (0, w.default)(P, N);
exports.getInstance = function (e) {
  return x(undefined, undefined, undefined, (0, u.default)().mark(function e() {
    return (0, u.default)().wrap(function (e) {
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
};
exports.default = I;
};
