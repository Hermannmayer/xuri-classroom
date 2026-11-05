// webpack module 17190 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachTypeApi = j;
exports.getInstance = exports.default = undefined;
exports.getKeyThenIncreaseKey = A;
exports.typeList = undefined;
var o;
var a;
var s;
var u;
var l = i(require("./90585.js"));
var c = i(require("./14389.js"));
var p = i(require("./31789.js"));
var d = i(require("./77468.js"));
var f = i(require("./14445.js"));
var g = i(require("./27112.js"));
var m = i(require("./23973.js"));
var v = i(require("./38399.js"));
var y = i(require("./42723.js"));
var h = n(require("./59496.js"));
var b = n(require("./96583.js"));
var w = i(require("./79806.js"));
var x = 3;
var E = 1;
var k = "";
var S = "move-up";
var T = false;
var C = false;
function A() {
  return E++;
}
function _(e) {
  if (e.top !== undefined) {
    a = e.top;
    o = null;
  }
  if (e.duration !== undefined) {
    x = e.duration;
  }
  if (e.prefixCls !== undefined) {
    k = e.prefixCls;
  }
  if (e.getContainer !== undefined) {
    s = e.getContainer;
    o = null;
  }
  if (e.transitionName !== undefined) {
    S = e.transitionName;
    o = null;
    T = true;
  }
  if (e.maxCount !== undefined) {
    u = e.maxCount;
    o = null;
  }
  if (e.rtl !== undefined) {
    C = e.rtl;
  }
}
function O(e, t) {
  var r = e.prefixCls;
  var n = e.getPopupContainer;
  var i = (0, b.globalConfig)();
  var l = i.getPrefixCls;
  var c = i.getRootPrefixCls;
  var p = i.getIconPrefixCls;
  var d = l("message", r || k);
  var f = c(e.rootPrefixCls, d);
  var g = p();
  if (o) {
    t({
      prefixCls: d,
      rootPrefixCls: f,
      iconPrefixCls: g,
      instance: o
    });
  } else {
    var m = {
      prefixCls: d,
      transitionName: T ? S : `${f}-${S}`,
      style: {
        top: a
      },
      getContainer: s || n,
      maxCount: u
    };
    y.default.newInstance(m, function (e) {
      if (o) {
        t({
          prefixCls: d,
          rootPrefixCls: f,
          iconPrefixCls: g,
          instance: o
        });
      } else {
        o = e;
        t({
          prefixCls: d,
          rootPrefixCls: f,
          iconPrefixCls: g,
          instance: e
        });
      }
    });
  }
}
var M = {
  info: g.default,
  success: p.default,
  error: d.default,
  warning: f.default,
  loading: m.default
};
var P = exports.typeList = Object.keys(M);
function q(e, t, r) {
  var n = e.duration !== undefined ? e.duration : x;
  var i = M[e.type];
  var o = (0, v.default)(`${t}-custom-content`, (0, c.default)((0, c.default)({}, `${t}-${e.type}`, e.type), `${t}-rtl`, C === true));
  return {
    key: e.key,
    duration: n,
    style: e.style || {},
    className: e.className,
    content: h.createElement(b.default, {
      iconPrefixCls: r
    }, h.createElement("div", {
      className: o
    }, e.icon || i && h.createElement(i, null), h.createElement("span", null, e.content))),
    onClose: e.onClose,
    onClick: e.onClick
  };
}
function N(e) {
  var t = e.key || A();
  var r = new Promise(function (r) {
    function n() {
      if (typeof e.onClose === "function") {
        e.onClose();
      }
      return r(true);
    }
    O(e, function (r) {
      var i = r.prefixCls;
      var o = r.iconPrefixCls;
      var a = r.instance;
      a.notice(q((0, l.default)((0, l.default)({}, e), {
        key: t,
        onClose: n
      }), i, o));
    });
  });
  function n() {
    var r;
    if (o) {
      o.removeNotice(t);
      if ((r = e.onClose) !== null && r !== undefined) {
        r.call(e);
      }
    }
  }
  n.then = function (e, t) {
    return r.then(e, t);
  };
  n.promise = r;
  return n;
}
function R(e) {
  return Object.prototype.toString.call(e) === "[object Object]" && !!e.content;
}
var I = {
  open: N,
  config: _,
  destroy: function (e) {
    if (o) {
      if (e) {
        var t = o;
        var r = t.removeNotice;
        r(e);
      } else {
        var n = o;
        var i = n.destroy;
        i();
        o = null;
      }
    }
  }
};
function j(e, t) {
  e[t] = function (r, n, i) {
    if (R(r)) {
      return e.open((0, l.default)((0, l.default)({}, r), {
        type: t
      }));
    } else {
      if (typeof n === "function") {
        i = n;
        n = undefined;
      }
      return e.open({
        content: r,
        duration: n,
        type: t,
        onClose: i
      });
    }
  };
}
P.forEach(function (e) {
  return j(I, e);
});
I.warn = I.warning;
I.useMessage = (0, w.default)(O, q);
exports.getInstance = function () {
  return null;
};
exports.default = I;
};
