// webpack module 59484 — body from webcrack
module.exports = function (module, exports, require) {
function n(e) {
  if (e && typeof e === "object" && "default" in e) {
    return e.default;
  } else {
    return e;
  }
}
var i = require("./59496.js");
var o = n(i);
function a(e, t, r) {
  if (t in e) {
    Object.defineProperty(e, t, {
      value: r,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    e[t] = r;
  }
  return e;
}
function s(e, t) {
  e.prototype = Object.create(t.prototype);
  e.prototype.constructor = e;
  e.__proto__ = t;
}
var u = typeof window !== "undefined" && !!window.document && !!window.document.createElement;
function l(e, t, r) {
  if (typeof e !== "function") {
    throw new Error("Expected reducePropsToState to be a function.");
  }
  if (typeof t !== "function") {
    throw new Error("Expected handleStateChangeOnClient to be a function.");
  }
  if (typeof r !== "undefined" && typeof r !== "function") {
    throw new Error("Expected mapStateOnServer to either be undefined or a function.");
  }
  function n(e) {
    return e.displayName || e.name || "Component";
  }
  return function (l) {
    if (typeof l !== "function") {
      throw new Error("Expected WrappedComponent to be a React component.");
    }
    var c;
    var p = [];
    function d() {
      c = e(p.map(function (e) {
        return e.props;
      }));
      if (f.canUseDOM) {
        t(c);
      } else if (r) {
        c = r(c);
      }
    }
    var f = function (e) {
      function t() {
        return e.apply(this, arguments) || this;
      }
      s(t, e);
      t.peek = function () {
        return c;
      };
      t.rewind = function () {
        if (t.canUseDOM) {
          throw new Error("You may only call rewind() on the server. Call peek() to read the current state.");
        }
        var e = c;
        c = undefined;
        p = [];
        return e;
      };
      var r = t.prototype;
      r.UNSAFE_componentWillMount = function () {
        p.push(this);
        d();
      };
      r.componentDidUpdate = function () {
        d();
      };
      r.componentWillUnmount = function () {
        var e = p.indexOf(this);
        p.splice(e, 1);
        d();
      };
      r.render = function () {
        return o.createElement(l, this.props);
      };
      return t;
    }(i.PureComponent);
    a(f, "displayName", "SideEffect(" + n(l) + ")");
    a(f, "canUseDOM", u);
    return f;
  };
}
module.exports = l;
};
