// webpack module 7252 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return T;
  }
});
var n = require("./8951.js");
var i = require("./45810.js");
var o = require("./12683.js");
var a = require("./69926.js");
var s = require("./53691.js");
var u = require("./39695.js");
var l = require("./78212.js");
var c = require("./96417.js");
var p = require("./97969.js");
var d = require("./59496.js");
var f = require("./52520.js");
var g = require("./45406.js");
var m = 0;
var v = {};
function y(e, t = 1) {
  var r = m++;
  var n = t;
  function i() {
    n -= 1;
    if (n <= 0) {
      e();
      delete v[r];
    } else {
      v[r] = (0, g.Z)(i);
    }
  }
  v[r] = (0, g.Z)(i);
  return r;
}
y.cancel = function (e) {
  if (e !== undefined) {
    g.Z.cancel(v[e]);
    delete v[e];
  }
};
y.ids = v;
var h;
var b = require("./40937.js");
function w(e, t, r) {
  t = (0, s.Z)(t);
  return (0, o.Z)(e, (0, a.Z)() ? Reflect.construct(t, r || [], (0, s.Z)(e).constructor) : t.apply(e, r));
}
function x(e) {
  return !e || e.offsetParent === null || e.hidden;
}
function E(e) {
  if (e instanceof Document) {
    return e.body;
  } else {
    return Array.from(e.childNodes).find(function (e) {
      return e?.nodeType === Node.ELEMENT_NODE;
    });
  }
}
function k(e) {
  var t = (e || "").match(/rgba?\((\d*), (\d*), (\d*)(, [\d.]*)?\)/);
  return !t || !t[1] || !t[2] || !t[3] || t[1] !== t[2] || t[2] !== t[3];
}
var S = function (e) {
  function t() {
    var e;
    (0, n.Z)(this, t);
    e = w(this, t, arguments);
    e.containerRef = d.createRef();
    e.animationStart = false;
    e.destroyed = false;
    e.onClick = function (t, r) {
      var n;
      var o = e.props;
      var a = o.insertExtraNode;
      var s = o.disabled;
      if (!s && t && !x(t) && !t.className.includes("-leave")) {
        e.extraNode = document.createElement("div");
        var l = (0, u.Z)(e);
        var p = l.extraNode;
        var d = e.context.getPrefixCls;
        p.className = `${d("")}-click-animating-node`;
        var f = e.getAttributeName();
        t.setAttribute(f, "true");
        if (r && r !== "#fff" && r !== "#ffffff" && r !== "rgb(255, 255, 255)" && r !== "rgba(255, 255, 255, 1)" && k(r) && !/rgba\((?:\d*, ){3}0\)/.test(r) && r !== "transparent") {
          p.style.borderColor = r;
          var g = ((n = t.getRootNode) === null || n === undefined ? undefined : n.call(t)) || t.ownerDocument;
          var m = E(g) ?? g;
          h = (0, c.hq)(`
      [${d("")}-click-animating-without-extra-node='true']::after, .${d("")}-click-animating-node {
        --antd-wave-shadow-color: ${r};
      }`, "antd-wave", {
            csp: e.csp,
            attachTo: m
          });
        }
        if (a) {
          t.appendChild(p);
        }
        ["transition", "animation"].forEach(function (r) {
          t.addEventListener(`${r}start`, e.onTransitionStart);
          t.addEventListener(`${r}end`, e.onTransitionEnd);
        });
      }
    };
    e.onTransitionStart = function (t) {
      if (!e.destroyed) {
        var r = e.containerRef.current;
        if (t && t.target === r && !e.animationStart) {
          e.resetEffect(r);
        }
      }
    };
    e.onTransitionEnd = function (t) {
      if (t && t.animationName === "fadeEffect") {
        e.resetEffect(t.target);
      }
    };
    e.bindAnimationEvent = function (t) {
      if (t && t.getAttribute && !t.getAttribute("disabled") && !t.className.includes("disabled")) {
        function r(r) {
          if (r.target.tagName !== "INPUT" && !x(r.target)) {
            e.resetEffect(t);
            var n = getComputedStyle(t).getPropertyValue("border-top-color") || getComputedStyle(t).getPropertyValue("border-color") || getComputedStyle(t).getPropertyValue("background-color");
            e.clickWaveTimeoutId = window.setTimeout(function () {
              return e.onClick(t, n);
            }, 0);
            y.cancel(e.animationStartId);
            e.animationStart = true;
            e.animationStartId = y(function () {
              e.animationStart = false;
            }, 10);
          }
        }
        t.addEventListener("click", r, true);
        return {
          cancel: function () {
            t.removeEventListener("click", r, true);
          }
        };
      }
    };
    e.renderWave = function (t) {
      var r = t.csp;
      var n = e.props.children;
      e.csp = r;
      if (!d.isValidElement(n)) {
        return n;
      }
      var i = e.containerRef;
      if ((0, p.Yr)(n)) {
        i = (0, p.sQ)(n.ref, e.containerRef);
      }
      return (0, b.Tm)(n, {
        ref: i
      });
    };
    return e;
  }
  (0, l.Z)(t, e);
  (0, i.Z)(t, [{
    key: "componentDidMount",
    value: function () {
      this.destroyed = false;
      var e = this.containerRef.current;
      if (e && e.nodeType === 1) {
        this.instance = this.bindAnimationEvent(e);
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function () {
      if (this.instance) {
        this.instance.cancel();
      }
      if (this.clickWaveTimeoutId) {
        clearTimeout(this.clickWaveTimeoutId);
      }
      this.destroyed = true;
    }
  }, {
    key: "getAttributeName",
    value: function () {
      var e = this.context.getPrefixCls;
      var t = this.props.insertExtraNode;
      return `${e("")}${t ? "-click-animating" : "-click-animating-without-extra-node"}`;
    }
  }, {
    key: "resetEffect",
    value: function (e) {
      var t = this;
      if (e && e !== this.extraNode && e instanceof Element) {
        var r = this.props.insertExtraNode;
        var n = this.getAttributeName();
        e.setAttribute(n, "false");
        if (h) {
          h.innerHTML = "";
        }
        if (r && this.extraNode && e.contains(this.extraNode)) {
          e.removeChild(this.extraNode);
        }
        ["transition", "animation"].forEach(function (r) {
          e.removeEventListener(`${r}start`, t.onTransitionStart);
          e.removeEventListener(`${r}end`, t.onTransitionEnd);
        });
      }
    }
  }, {
    key: "render",
    value: function () {
      return d.createElement(f.C, null, this.renderWave);
    }
  }]);
  return t;
}(d.Component);
S.contextType = f.E_;
var T = S;
};
