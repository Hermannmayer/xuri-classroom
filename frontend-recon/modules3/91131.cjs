// webpack module 91131 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./34256.js");
var i = require("./23874.js");
var o = require("./64515.js");
var a = require("./59496.js");
var s = require("./12388.js");
var u = require("./52801.js");
function l(e) {
  return !!e && !!e.then;
}
function c(e) {
  var t = a.useRef(false);
  var r = a.useRef(null);
  var c = (0, o.Z)(false);
  var p = (0, i.Z)(c, 2);
  var d = p[0];
  var f = p[1];
  var g = e.close;
  function m() {
    if (g !== null && g !== undefined) {
      g.apply(undefined, arguments);
    }
  }
  a.useEffect(function () {
    var t = null;
    if (e.autoFocus) {
      t = setTimeout(function () {
        var e;
        if ((e = r.current) !== null && e !== undefined) {
          e.focus();
        }
      });
    }
    return function () {
      if (t) {
        clearTimeout(t);
      }
    };
  }, []);
  function v(e) {
    if (l(e)) {
      f(true);
      e.then(function () {
        f(false, true);
        m.apply(undefined, arguments);
        t.current = false;
      }, function (e) {
        f(false, true);
        t.current = false;
        return Promise.reject(e);
      });
    }
  }
  function y(r) {
    var n = e.actionFn;
    if (!t.current) {
      t.current = true;
      if (n) {
        var i;
        if (e.emitEvent) {
          i = n(r);
          if (e.quitOnNullishReturnValue && !l(i)) {
            t.current = false;
            m(r);
            return;
          }
        } else if (n.length) {
          i = n(g);
          t.current = false;
        } else {
          i = n();
          if (!i) {
            m();
            return;
          }
        }
        v(i);
      } else {
        m();
      }
    }
  }
  var h = e.type;
  var b = e.children;
  var w = e.prefixCls;
  var x = e.buttonProps;
  return a.createElement(s.Z, (0, n.Z)({}, (0, u.n)(h), {
    onClick: y,
    loading: d,
    prefixCls: w
  }, x, {
    ref: r
  }), b);
}
exports.Z = c;
};
