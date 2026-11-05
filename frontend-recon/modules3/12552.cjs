// webpack module 12552 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return f;
  }
});
var n = require("./34256.js");
var i = require("./21487.js");
var o = require("./8951.js");
var a = require("./45810.js");
var s = require("./78212.js");
var u = require("./19746.js");
var l = require("./59496.js");
var c = require("./87995.js");
var p = require("./38399.js");
var d = p;
var f = function (e) {
  (0, s.Z)(r, e);
  var t = (0, u.Z)(r);
  function r() {
    var e;
    (0, o.Z)(this, r);
    for (var n = arguments.length, i = new Array(n), a = 0; a < n; a++) {
      i[a] = arguments[a];
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
  (0, a.Z)(r, [{
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
      var o = t.className;
      var a = t.closable;
      var s = t.closeIcon;
      var u = t.style;
      var p = t.onClick;
      var f = t.children;
      var g = t.holder;
      var m = `${r}-notice`;
      var v = Object.keys(this.props).reduce(function (t, r) {
        if (r.substr(0, 5) === "data-" || r.substr(0, 5) === "aria-" || r === "role") {
          t[r] = e.props[r];
        }
        return t;
      }, {});
      var y = l.createElement("div", (0, n.Z)({
        className: d(m, o, (0, i.Z)({}, `${m}-closable`, a)),
        style: u,
        onMouseEnter: this.clearCloseTimer,
        onMouseLeave: this.startCloseTimer,
        onClick: p
      }, v), l.createElement("div", {
        className: `${m}-content`
      }, f), a ? l.createElement("a", {
        tabIndex: 0,
        onClick: this.close,
        className: `${m}-close`
      }, s || l.createElement("span", {
        className: `${m}-close-x`
      })) : null);
      if (g) {
        return c.createPortal(y, g);
      } else {
        return y;
      }
    }
  }]);
  return r;
}(l.Component);
f.defaultProps = {
  onClose: function () {},
  duration: 1.5
};
};
