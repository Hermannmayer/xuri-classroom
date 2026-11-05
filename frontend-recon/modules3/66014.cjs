// webpack module 66014 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  matchRoutes: function () {
    return a;
  },
  renderRoutes: function () {
    return s;
  }
});
var n = require("83978");
var i = require("34256");
var o = require("59496");
function a(e, t, r = []) {
  e.some(function (e) {
    var i = e.path ? (0, n.LX)(t, e) : r.length ? r[r.length - 1].match : n.F0.computeRootMatch(t);
    if (i) {
      r.push({
        route: e,
        match: i
      });
      if (e.routes) {
        a(e.routes, t, r);
      }
    }
    return i;
  });
  return r;
}
function s(e, t = {}, r = {}) {
  if (e) {
    return o.createElement(n.rs, r, e.map(function (e, r) {
      return o.createElement(n.AW, {
        key: e.key || r,
        path: e.path,
        exact: e.exact,
        strict: e.strict,
        render: function (r) {
          if (e.render) {
            return e.render((0, i.Z)({}, r, {}, t, {
              route: e
            }));
          } else {
            return o.createElement(e.component, (0, i.Z)({}, r, t, {
              route: e
            }));
          }
        }
      });
    }));
  } else {
    return null;
  }
}
};
