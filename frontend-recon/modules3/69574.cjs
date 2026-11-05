// webpack module 69574 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./70192.js");
var i = require("./59496.js");
var o = require("./87995.js");
var a = require("./66014.js");
function s(e) {
  if (e && typeof e === "object" && "default" in e) {
    return e;
  } else {
    return {
      default: e
    };
  }
}
var u = s(i);
function l(e, t) {
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
function c(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] ?? {};
    if (t % 2) {
      l(Object(r), true).forEach(function (t) {
        f(e, t, r[t]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(e, Object.getOwnPropertyDescriptors(r));
    } else {
      l(Object(r)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
      });
    }
  }
  return e;
}
function p(e, t, r, n, i, o, a) {
  try {
    var s = e[o](a);
    var u = s.value;
  } catch (l) {
    r(l);
    return;
  }
  if (s.done) {
    t(u);
  } else {
    Promise.resolve(u).then(n, i);
  }
}
function d(e) {
  return function () {
    var t = this;
    var r = arguments;
    return new Promise(function (n, i) {
      var o = e.apply(t, r);
      function a(e) {
        p(o, n, i, a, s, "next", e);
      }
      function s(e) {
        p(o, n, i, a, s, "throw", e);
      }
      a(undefined);
    });
  };
}
function f(e, t, r) {
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
function g() {
  g = Object.assign || function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if (Object.prototype.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  return g.apply(this, arguments);
}
function m(e, t) {
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
function v(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = m(e, t);
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
function y(e, t) {
  return h(e) || b(e, t) || w(e, t) || E();
}
function h(e) {
  if (Array.isArray(e)) {
    return e;
  }
}
function b(e, t) {
  var r = e == null ? null : typeof Symbol !== "undefined" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n;
    var i;
    var o = [];
    var a = true;
    var s = false;
    try {
      for (r = r.call(e); !(a = (n = r.next()).done); a = true) {
        o.push(n.value);
        if (t && o.length === t) {
          break;
        }
      }
    } catch (u) {
      s = true;
      i = u;
    } finally {
      try {
        if (!a && r.return != null) {
          r.return();
        }
      } finally {
        if (s) {
          throw i;
        }
      }
    }
    return o;
  }
}
function w(e, t) {
  if (e) {
    if (typeof e === "string") {
      return x(e, t);
    }
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor) {
      r = e.constructor.name;
    }
    if (r === "Map" || r === "Set") {
      return Array.from(e);
    } else if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) {
      return x(e, t);
    } else {
      return undefined;
    }
  }
}
function x(e, t) {
  if (t == null || t > e.length) {
    t = e.length;
  }
  for (var r = 0, n = new Array(t); r < t; r++) {
    n[r] = e[r];
  }
  return n;
}
function E() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function k(e, t) {
  var r = typeof Symbol !== "undefined" && e[Symbol.iterator] || e["@@iterator"];
  if (!r) {
    if (Array.isArray(e) || (r = w(e)) || t && e && typeof e.length === "number") {
      if (r) {
        e = r;
      }
      var n = 0;
      function i() {}
      return {
        s: i,
        n: function () {
          if (n >= e.length) {
            return {
              done: true
            };
          } else {
            return {
              done: false,
              value: e[n++]
            };
          }
        },
        e: function (e) {
          throw e;
        },
        f: i
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var o;
  var a = true;
  var s = false;
  return {
    s: function () {
      r = r.call(e);
    },
    n: function () {
      var e = r.next();
      a = e.done;
      return e;
    },
    e: function (e) {
      s = true;
      o = e;
    },
    f: function () {
      try {
        if (!a && r.return != null) {
          r.return();
        }
      } finally {
        if (s) {
          throw o;
        }
      }
    }
  };
}
function S(e) {
  return u.default.createElement(n.__RouterContext.Consumer, null, function (t) {
    var r = e.location || t.location;
    var i = e.computedMatch;
    var o = c(c({}, t), {}, {
      location: r,
      match: i
    });
    var a = e.render;
    return u.default.createElement(n.__RouterContext.Provider, {
      value: o
    }, o.match ? a(c(c({}, e.layoutProps), o)) : null);
  });
}
var T = ["children"];
function C(e) {
  return u.default.createElement(n.__RouterContext.Consumer, null, function (t) {
    var r;
    var o = e.children;
    var a = v(e, T);
    var s = e.location || t.location;
    var u = null;
    i.Children.forEach(o, function (e) {
      if (u === null && i.isValidElement(e)) {
        r = e;
        var o = e.props.path || e.props.from;
        u = o ? n.matchPath(s.pathname, c(c({}, e.props), {}, {
          path: o
        })) : t.match;
      }
    });
    if (u) {
      return i.cloneElement(r, {
        location: s,
        computedMatch: u,
        layoutProps: a
      });
    } else {
      return null;
    }
  });
}
var A = ["component"];
function _(e, t) {
  e.component;
  var r = v(e, A);
  var o = e.component;
  function a(a) {
    var s = i.useState(function () {
      return window.g_initialProps;
    });
    var l = y(s, 2);
    var p = l[0];
    var f = l[1];
    i.useEffect(function () {
      var i = function () {
        var i = d(regeneratorRuntime.mark(function i() {
          var u;
          var l;
          var p;
          var d;
          return regeneratorRuntime.wrap(function (i) {
            while (1) {
              switch (i.prev = i.next) {
                case 0:
                  u = o;
                  if (!o.preload) {
                    i.next = 6;
                    break;
                  }
                  i.next = 4;
                  return o.preload();
                case 4:
                  u = i.sent;
                  u = u.default || u;
                case 6:
                  l = c(c({
                    isServer: false,
                    match: a?.match,
                    history: a?.history,
                    route: e
                  }, t.getInitialPropsCtx || {}), r);
                  if (!u?.getInitialProps) {
                    i.next = 15;
                    break;
                  }
                  i.next = 10;
                  return t.plugin.applyPlugins({
                    key: "ssr.modifyGetInitialPropsCtx",
                    type: n.ApplyPluginsType.modify,
                    initialValue: l,
                    async: true
                  });
                case 10:
                  p = i.sent;
                  i.next = 13;
                  return u.getInitialProps(p || l);
                case 13:
                  d = i.sent;
                  f(d);
                case 15:
                case "end":
                  return i.stop();
              }
            }
          }, i);
        }));
        return function () {
          return i.apply(this, arguments);
        };
      }();
      if (!window.g_initialProps) {
        i();
      }
    }, [window.location.pathname, window.location.search]);
    return u.default.createElement(o, g({}, a, p));
  }
  a.wrapInitialPropsLoaded = true;
  a.displayName = "ComponentWithInitialPropsFetch";
  return a;
}
function O(e) {
  var t = e.route;
  var r = e.opts;
  var n = e.props;
  var o = P(c(c({}, r), {}, {
    routes: t.routes || [],
    rootRoutes: r.rootRoutes
  }), {
    location: n.location
  });
  var a = t.component;
  var s = t.wrappers;
  if (a) {
    var l = r.isServer ? {} : window.g_initialProps;
    var p = c(c(c(c({}, n), r.extraProps), r.pageInitialProps || l), {}, {
      route: t,
      routes: r.rootRoutes
    });
    var d = u.default.createElement(a, p, o);
    if (s) {
      var f = s.length - 1;
      while (f >= 0) {
        d = i.createElement(s[f], p, d);
        f -= 1;
      }
    }
    return d;
  }
  return o;
}
function M(e) {
  var o = e.route;
  var a = e.index;
  var s = e.opts;
  var l = {
    key: o.key || a,
    exact: o.exact,
    strict: o.strict,
    sensitive: o.sensitive,
    path: o.path
  };
  if (o.redirect) {
    return u.default.createElement(n.Redirect, g({}, l, {
      from: o.path,
      to: o.redirect
    }));
  } else {
    if (!!s.ssrProps && !s.isServer && !o.component?.wrapInitialPropsLoaded && (!!o.component?.getInitialProps || !!o.component?.preload)) {
      o.component = _(o, s);
    }
    return u.default.createElement(S, g({}, l, {
      render: function (e) {
        return O({
          route: o,
          opts: s,
          props: e
        });
      }
    }));
  }
}
function P(e, t = {}) {
  if (e.routes) {
    return u.default.createElement(C, t, e.routes.map(function (t, r) {
      return M({
        route: t,
        index: r,
        opts: c(c({}, e), {}, {
          rootRoutes: e.rootRoutes || e.routes
        })
      });
    }));
  } else {
    return null;
  }
}
var q = ["history"];
function N(e) {
  var t = e.history;
  var r = v(e, q);
  i.useEffect(function () {
    function i(t, i, o = false) {
      var s = a.matchRoutes(e.routes, t.pathname);
      if (typeof document !== "undefined" && r.defaultTitle !== undefined) {
        document.title = s.length && s[s.length - 1].route.title || r.defaultTitle || "";
      }
      e.plugin.applyPlugins({
        key: "onRouteChange",
        type: n.ApplyPluginsType.event,
        args: {
          routes: e.routes,
          matchedRoutes: s,
          location: t,
          action: i,
          isFirst: o
        }
      });
    }
    if (window.g_useSSR) {
      window.g_initialProps = null;
    }
    i(t.location, "POP", true);
    return t.listen(i);
  }, [t]);
  return u.default.createElement(n.Router, {
    history: t
  }, P(r));
}
function R(e) {
  return e.plugin.applyPlugins({
    type: n.ApplyPluginsType.modify,
    key: "rootContainer",
    initialValue: u.default.createElement(N, {
      history: e.history,
      routes: e.routes,
      plugin: e.plugin,
      ssrProps: e.ssrProps,
      defaultTitle: e.defaultTitle
    }),
    args: {
      history: e.history,
      routes: e.routes,
      plugin: e.plugin
    }
  });
}
function I(e) {
  return j.apply(this, arguments);
}
function j() {
  j = d(regeneratorRuntime.mark(function e(t) {
    var r;
    var n;
    var i;
    var o;
    var u;
    var l;
    var c;
    var p = arguments;
    return regeneratorRuntime.wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            r = p.length > 1 && p[1] !== undefined ? p[1] : window.location.pathname;
            n = a.matchRoutes(t, r);
            i = k(n);
            e.prev = 3;
            i.s();
          case 5:
            if ((o = i.n()).done) {
              e.next = 19;
              break;
            }
            u = o.value;
            l = u.route;
            if (typeof l.component === "string" || !l.component?.preload) {
              e.next = 13;
              break;
            }
            e.next = 11;
            return l.component.preload();
          case 11:
            c = e.sent;
            l.component = c.default || c;
          case 13:
            if (!l.routes) {
              e.next = 17;
              break;
            }
            e.next = 16;
            return I(l.routes, r);
          case 16:
            l.routes = e.sent;
          case 17:
            e.next = 5;
            break;
          case 19:
            e.next = 24;
            break;
          case 21:
            e.prev = 21;
            e.t0 = e.catch(3);
            i.e(e.t0);
          case 24:
            e.prev = 24;
            i.f();
            return e.finish(24);
          case 27:
            return e.abrupt("return", t);
          case 28:
          case "end":
            return e.stop();
        }
      }
    }, e, null, [[3, 21, 24, 27]]);
  }));
  return j.apply(this, arguments);
}
function D(e) {
  var t = R(e);
  if (!e.rootElement) {
    return t;
  }
  var r = typeof e.rootElement === "string" ? document.getElementById(e.rootElement) : e.rootElement;
  var n = e.callback || function () {};
  if (window.g_useSSR) {
    if (e.dynamicImport) {
      I(e.routes).then(function () {
        o.hydrate(t, r, n);
      });
    } else {
      o.hydrate(t, r, n);
    }
  } else {
    o.render(t, r, n);
  }
}
exports.p6 = D;
};
