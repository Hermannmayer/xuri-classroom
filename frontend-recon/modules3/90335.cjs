// webpack module 90335 — body from webcrack
module.exports = function (module, exports, require) {
function n(e) {
  n = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function (e) {
    return typeof e;
  } : function (e) {
    if (e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype) {
      return "symbol";
    } else {
      return typeof e;
    }
  };
  return n(e);
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CopyToClipboard = undefined;
var i = s(require("./59496.js"));
var o = s(require("./874.js"));
var a = ["text", "onCopy", "options", "children"];
function s(e) {
  if (e && e.__esModule) {
    return e;
  } else {
    return {
      default: e
    };
  }
}
function u(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    if (t) {
      n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      });
    }
    r.push.apply(r, n);
  }
  return r;
}
function l(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] ?? {};
    if (t % 2) {
      u(Object(r), true).forEach(function (t) {
        E(e, t, r[t]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(e, Object.getOwnPropertyDescriptors(r));
    } else {
      u(Object(r)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
      });
    }
  }
  return e;
}
function c(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = p(e, t);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    for (n = 0; n < o.length; n++) {
      r = o[n];
      if (!(t.indexOf(r) >= 0)) {
        if (Object.prototype.propertyIsEnumerable.call(e, r)) {
          i[r] = e[r];
        }
      }
    }
  }
  return i;
}
function p(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = {};
  var o = Object.keys(e);
  for (n = 0; n < o.length; n++) {
    r = o[n];
    if (!(t.indexOf(r) >= 0)) {
      i[r] = e[r];
    }
  }
  return i;
}
function d(e, t) {
  if (!(e instanceof t)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function f(e, t) {
  for (var r = 0; r < t.length; r++) {
    var n = t[r];
    n.enumerable = n.enumerable || false;
    n.configurable = true;
    if ("value" in n) {
      n.writable = true;
    }
    Object.defineProperty(e, n.key, n);
  }
}
function g(e, t, r) {
  if (t) {
    f(e.prototype, t);
  }
  if (r) {
    f(e, r);
  }
  Object.defineProperty(e, "prototype", {
    writable: false
  });
  return e;
}
function m(e, t) {
  if (typeof t !== "function" && t !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  e.prototype = Object.create(t && t.prototype, {
    constructor: {
      value: e,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(e, "prototype", {
    writable: false
  });
  if (t) {
    v(e, t);
  }
}
function v(e, t) {
  v = Object.setPrototypeOf || function (e, t) {
    e.__proto__ = t;
    return e;
  };
  return v(e, t);
}
function y(e) {
  var t = w();
  return function () {
    var r;
    var n = x(e);
    if (t) {
      var i = x(this).constructor;
      r = Reflect.construct(n, arguments, i);
    } else {
      r = n.apply(this, arguments);
    }
    return h(this, r);
  };
}
function h(e, t) {
  if (t && (n(t) === "object" || typeof t === "function")) {
    return t;
  }
  if (t !== undefined) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }
  return b(e);
}
function b(e) {
  if (e === undefined) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return e;
}
function w() {
  if (typeof Reflect === "undefined" || !Reflect.construct) {
    return false;
  }
  if (Reflect.construct.sham) {
    return false;
  }
  if (typeof Proxy === "function") {
    return true;
  }
  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}
function x(e) {
  x = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
    return e.__proto__ || Object.getPrototypeOf(e);
  };
  return x(e);
}
function E(e, t, r) {
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
var k = function (e) {
  m(r, e);
  var t = y(r);
  function r() {
    var e;
    d(this, r);
    for (var n = arguments.length, a = new Array(n), s = 0; s < n; s++) {
      a[s] = arguments[s];
    }
    e = t.call.apply(t, [this].concat(a));
    E(b(e), "onClick", function (t) {
      var r = e.props;
      var n = r.text;
      var a = r.onCopy;
      var s = r.children;
      var u = r.options;
      var l = i.default.Children.only(s);
      var c = (0, o.default)(n, u);
      if (a) {
        a(n, c);
      }
      if (l && l.props && typeof l.props.onClick === "function") {
        l.props.onClick(t);
      }
    });
    return e;
  }
  g(r, [{
    key: "render",
    value: function () {
      var e = this.props;
      e.text;
      e.onCopy;
      e.options;
      var t = e.children;
      var r = c(e, a);
      var n = i.default.Children.only(t);
      return i.default.cloneElement(n, l(l({}, r), {}, {
        onClick: this.onClick
      }));
    }
  }]);
  return r;
}(i.default.PureComponent);
exports.CopyToClipboard = k;
E(k, "defaultProps", {
  onCopy: undefined,
  options: undefined
});
};
