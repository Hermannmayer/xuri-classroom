// webpack module 17959 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;
var o;
var a = i(require("./71889.js"));
var s = i(require("./34178.js"));
var u = i(require("./46635.js"));
var l = i(require("./15634.js"));
var c = i(require("./76745.js"));
var p = i(require("./87050.js"));
var d = i(require("./62298.js"));
var f = require("./16732.js");
var g = require("./29386.js");
var m = n(require("./59496.js"));
var v = require("./96583.js");
var y = i(require("./86975.js"));
var h = require("./26701.js");
function b(e, t, r) {
  t = (0, c.default)(t);
  return (0, u.default)(e, (0, l.default)() ? Reflect.construct(t, r || [], (0, c.default)(e).constructor) : t.apply(e, r));
}
function w(e) {
  return !e || e.offsetParent === null || e.hidden;
}
function x(e) {
  if (e instanceof Document) {
    return e.body;
  } else {
    return Array.from(e.childNodes).find(function (e) {
      return e?.nodeType === Node.ELEMENT_NODE;
    });
  }
}
function E(e) {
  var t = (e || "").match(/rgba?\((\d*), (\d*), (\d*)(, [\d.]*)?\)/);
  return !t || !t[1] || !t[2] || !t[3] || t[1] !== t[2] || t[2] !== t[3];
}
var k = function (e) {
  function t() {
    var e;
    (0, a.default)(this, t);
    e = b(this, t, arguments);
    e.containerRef = m.createRef();
    e.animationStart = false;
    e.destroyed = false;
    e.onClick = function (t, r) {
      var n;
      var a = e.props;
      var s = a.insertExtraNode;
      var u = a.disabled;
      if (!u && t && !w(t) && !t.className.includes("-leave")) {
        e.extraNode = document.createElement("div");
        var l = (0, p.default)(e);
        var c = l.extraNode;
        var d = e.context.getPrefixCls;
        c.className = `${d("")}-click-animating-node`;
        var g = e.getAttributeName();
        t.setAttribute(g, "true");
        if (r && r !== "#fff" && r !== "#ffffff" && r !== "rgb(255, 255, 255)" && r !== "rgba(255, 255, 255, 1)" && E(r) && !/rgba\((?:\d*, ){3}0\)/.test(r) && r !== "transparent") {
          c.style.borderColor = r;
          var m = ((n = t.getRootNode) === null || n === undefined ? undefined : n.call(t)) || t.ownerDocument;
          var v = x(m) ?? m;
          o = (0, f.updateCSS)(`
      [${d("")}-click-animating-without-extra-node='true']::after, .${d("")}-click-animating-node {
        --antd-wave-shadow-color: ${r};
      }`, "antd-wave", {
            csp: e.csp,
            attachTo: v
          });
        }
        if (s) {
          t.appendChild(c);
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
          if (r.target.tagName !== "INPUT" && !w(r.target)) {
            e.resetEffect(t);
            var n = getComputedStyle(t).getPropertyValue("border-top-color") || getComputedStyle(t).getPropertyValue("border-color") || getComputedStyle(t).getPropertyValue("background-color");
            e.clickWaveTimeoutId = window.setTimeout(function () {
              return e.onClick(t, n);
            }, 0);
            y.default.cancel(e.animationStartId);
            e.animationStart = true;
            e.animationStartId = (0, y.default)(function () {
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
      if (!m.isValidElement(n)) {
        return n;
      }
      var i = e.containerRef;
      if ((0, g.supportRef)(n)) {
        i = (0, g.composeRef)(n.ref, e.containerRef);
      }
      return (0, h.cloneElement)(n, {
        ref: i
      });
    };
    return e;
  }
  (0, d.default)(t, e);
  (0, s.default)(t, [{
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
        if (o) {
          o.innerHTML = "";
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
      return m.createElement(v.ConfigConsumer, null, this.renderWave);
    }
  }]);
  return t;
}(m.Component);
k.contextType = v.ConfigContext;
exports.default = k;
};
