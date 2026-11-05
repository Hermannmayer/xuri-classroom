// webpack module 74949 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
var i = require("./28004.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o = n(require("./90585.js"));
var a = n(require("./14389.js"));
var s = n(require("./71889.js"));
var u = n(require("./34178.js"));
var l = n(require("./62298.js"));
var c = n(require("./35092.js"));
var p = m(require("./59496.js"));
var d = n(require("./87995.js"));
var f = n(require("./38399.js"));
function g(e) {
  if (typeof WeakMap !== "function") {
    return null;
  }
  var t = new WeakMap();
  var r = new WeakMap();
  return (g = function (e) {
    if (e) {
      return r;
    } else {
      return t;
    }
  })(e);
}
function m(e, t) {
  if (!t && e && e.__esModule) {
    return e;
  }
  if (e === null || i(e) !== "object" && typeof e !== "function") {
    return {
      default: e
    };
  }
  var r = g(t);
  if (r && r.has(e)) {
    return r.get(e);
  }
  var n = {};
  var o = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var a in e) {
    if (a !== "default" && Object.prototype.hasOwnProperty.call(e, a)) {
      var s = o ? Object.getOwnPropertyDescriptor(e, a) : null;
      if (s && (s.get || s.set)) {
        Object.defineProperty(n, a, s);
      } else {
        n[a] = e[a];
      }
    }
  }
  n.default = e;
  if (r) {
    r.set(e, n);
  }
  return n;
}
var v = function (e) {
  (0, l.default)(r, e);
  var t = (0, c.default)(r);
  function r() {
    var e;
    (0, s.default)(this, r);
    for (var n = arguments.length, i = new Array(n), o = 0; o < n; o++) {
      i[o] = arguments[o];
    }
    e = t.call.apply(t, [this].concat(i));
    e.closeTimer = null;
    e.close = function (t) {
      if (t) {
        t.stopPropagation();
      }
      e.clearCloseTimer();
      var r = e.props;
      var n = r.onClose;
      var i = r.noticeKey;
      if (n) {
        n(i);
      }
    };
    e.startCloseTimer = function () {
      if (e.props.duration) {
        e.closeTimer = window.setTimeout(function () {
          e.close();
        }, e.props.duration * 1000);
      }
    };
    e.clearCloseTimer = function () {
      if (e.closeTimer) {
        clearTimeout(e.closeTimer);
        e.closeTimer = null;
      }
    };
    return e;
  }
  (0, u.default)(r, [{
    key: "componentDidMount",
    value: function () {
      this.startCloseTimer();
    }
  }, {
    key: "componentDidUpdate",
    value: function (e) {
      if (this.props.duration !== e.duration || this.props.updateMark !== e.updateMark || this.props.visible !== e.visible && this.props.visible) {
        this.restartCloseTimer();
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function () {
      this.clearCloseTimer();
    }
  }, {
    key: "restartCloseTimer",
    value: function () {
      this.clearCloseTimer();
      this.startCloseTimer();
    }
  }, {
    key: "render",
    value: function () {
      var e = this;
      var t = this.props;
      var r = t.prefixCls;
      var n = t.className;
      var i = t.closable;
      var s = t.closeIcon;
      var u = t.style;
      var l = t.onClick;
      var c = t.children;
      var g = t.holder;
      var m = `${r}-notice`;
      var v = Object.keys(this.props).reduce(function (t, r) {
        if (r.substr(0, 5) === "data-" || r.substr(0, 5) === "aria-" || r === "role") {
          t[r] = e.props[r];
        }
        return t;
      }, {});
      var y = p.createElement("div", (0, o.default)({
        className: (0, f.default)(m, n, (0, a.default)({}, `${m}-closable`, i)),
        style: u,
        onMouseEnter: this.clearCloseTimer,
        onMouseLeave: this.startCloseTimer,
        onClick: l
      }, v), p.createElement("div", {
        className: `${m}-content`
      }, c), i ? p.createElement("a", {
        tabIndex: 0,
        onClick: this.close,
        className: `${m}-close`
      }, s || p.createElement("span", {
        className: `${m}-close-x`
      })) : null);
      if (g) {
        return d.default.createPortal(y, g);
      } else {
        return y;
      }
    }
  }]);
  return r;
}(p.Component);
exports.default = v;
v.defaultProps = {
  onClose: function () {},
  duration: 1.5
};
};
