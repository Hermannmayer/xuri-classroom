// webpack module 42723 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  default: function () {
    return k;
  }
});
var n = require("37913");
var i = require("34256");
var o = require("91613");
var a = require("8951");
var s = require("45810");
var u = require("78212");
var l = require("19746");
var c = require("59496");
var p = require("69258");
var d = require("38399");
var f = d;
var g = require("96598");
var m = require("12552");
var v = require("99311");
var y = ["getContainer"];
var h = 0;
var b = Date.now();
function w() {
  var e = h;
  h += 1;
  return `rcNotification_${b}_${e}`;
}
var x = function (e) {
  (0, u.Z)(r, e);
  var t = (0, l.Z)(r);
  function r() {
    var e;
    (0, a.Z)(this, r);
    for (var n = arguments.length, i = new Array(n), s = 0; s < n; s++) {
      i[s] = arguments[s];
    }
    e = t.call.apply(t, [this].concat(i));
    e.state = {
      notices: []
    };
    e.hookRefs = new Map();
    e.add = function (t, r) {
      var i = t.key ?? w();
      var a = (0, o.Z)((0, o.Z)({}, t), {}, {
        key: i
      });
      var s = e.props.maxCount;
      e.setState(function (e) {
        var t = e.notices;
        var n = t.map(function (e) {
          return e.notice.key;
        }).indexOf(i);
        var o = t.concat();
        if (n !== -1) {
          o.splice(n, 1, {
            notice: a,
            holderCallback: r
          });
        } else {
          if (s && t.length >= s) {
            a.key = o[0].notice.key;
            a.updateMark = w();
            a.userPassKey = i;
            o.shift();
          }
          o.push({
            notice: a,
            holderCallback: r
          });
        }
        return {
          notices: o
        };
      });
    };
    e.remove = function (t) {
      e.setState(function (e) {
        var r = e.notices;
        return {
          notices: r.filter(function (e) {
            var r = e.notice;
            var n = r.key;
            var i = r.userPassKey;
            var o = i ?? n;
            return o !== t;
          })
        };
      });
    };
    e.noticePropsMap = {};
    return e;
  }
  (0, s.Z)(r, [{
    key: "getTransitionName",
    value: function () {
      var e = this.props;
      var t = e.prefixCls;
      var r = e.animation;
      var n = this.props.transitionName;
      if (!n && r) {
        n = `${t}-${r}`;
      }
      return n;
    }
  }, {
    key: "render",
    value: function () {
      var e = this;
      var t = this.state.notices;
      var r = this.props;
      var n = r.prefixCls;
      var a = r.className;
      var s = r.closeIcon;
      var u = r.style;
      var l = [];
      t.forEach(function (r, i) {
        var a = r.notice;
        var u = r.holderCallback;
        var c = i === t.length - 1 ? a.updateMark : undefined;
        var p = a.key;
        var d = a.userPassKey;
        var f = (0, o.Z)((0, o.Z)((0, o.Z)({
          prefixCls: n,
          closeIcon: s
        }, a), a.props), {}, {
          key: p,
          noticeKey: d || p,
          updateMark: c,
          onClose: function (t) {
            var r;
            e.remove(t);
            if ((r = a.onClose) !== null && r !== undefined) {
              r.call(a);
            }
          },
          onClick: a.onClick,
          children: a.content
        });
        l.push(p);
        e.noticePropsMap[p] = {
          props: f,
          holderCallback: u
        };
      });
      return c.createElement("div", {
        className: f(n, a),
        style: u
      }, c.createElement(g.CSSMotionList, {
        keys: l,
        motionName: this.getTransitionName(),
        onVisibleChanged: function (t, r) {
          var n = r.key;
          if (!t) {
            delete e.noticePropsMap[n];
          }
        }
      }, function (t) {
        var r = t.key;
        var a = t.className;
        var s = t.style;
        var u = t.visible;
        var l = e.noticePropsMap[r];
        var p = l.props;
        var d = l.holderCallback;
        if (d) {
          return c.createElement("div", {
            key: r,
            className: f(a, `${n}-hook-holder`),
            style: (0, o.Z)({}, s),
            ref: function (t) {
              if (typeof r !== "undefined") {
                if (t) {
                  e.hookRefs.set(r, t);
                  d(t, p);
                } else {
                  e.hookRefs.delete(r);
                }
              }
            }
          });
        } else {
          return c.createElement(m.Z, (0, i.Z)({}, p, {
            className: f(a, p?.className),
            style: (0, o.Z)((0, o.Z)({}, s), p?.style),
            visible: u
          }));
        }
      }));
    }
  }]);
  return r;
}(c.Component);
x.newInstance = undefined;
x.defaultProps = {
  prefixCls: "rc-notification",
  animation: "fade",
  style: {
    top: 65,
    left: "50%"
  }
};
x.newInstance = function (e, t) {
  var r = e || {};
  var o = r.getContainer;
  var a = (0, n.Z)(r, y);
  var s = document.createElement("div");
  if (o) {
    var u = o();
    u.appendChild(s);
  } else {
    document.body.appendChild(s);
  }
  var l = false;
  function d(e) {
    if (!l) {
      l = true;
      t({
        notice: function (t) {
          e.add(t);
        },
        removeNotice: function (t) {
          e.remove(t);
        },
        component: e,
        destroy: function () {
          (0, p.v)(s);
          if (s.parentNode) {
            s.parentNode.removeChild(s);
          }
        },
        useNotification: function () {
          return (0, v.Z)(e);
        }
      });
    }
  }
  (0, p.s)(c.createElement(x, (0, i.Z)({}, a, {
    ref: d
  })), s);
};
var E = x;
var k = E;
};
