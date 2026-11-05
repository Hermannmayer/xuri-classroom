// webpack module 56463 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js");
var i = require("./28004.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = d;
var o = n(require("./72408.js"));
var a = n(require("./90585.js"));
var s = n(require("./49277.js"));
var u = p(require("./59496.js"));
var l = n(require("./74949.js"));
function c(e) {
  if (typeof WeakMap !== "function") {
    return null;
  }
  var t = new WeakMap();
  var r = new WeakMap();
  return (c = function (e) {
    if (e) {
      return r;
    } else {
      return t;
    }
  })(e);
}
function p(e, t) {
  if (!t && e && e.__esModule) {
    return e;
  }
  if (e === null || i(e) !== "object" && typeof e !== "function") {
    return {
      default: e
    };
  }
  var r = c(t);
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
function d(e) {
  var t = u.useRef({});
  var r = u.useState([]);
  var n = (0, s.default)(r, 2);
  var i = n[0];
  var c = n[1];
  function p(r) {
    var n = true;
    e.add(r, function (e, r) {
      var i = r.key;
      if (e && (!t.current[i] || n)) {
        var s = u.createElement(l.default, (0, a.default)({}, r, {
          holder: e
        }));
        t.current[i] = s;
        c(function (e) {
          var t = e.findIndex(function (e) {
            return e.key === r.key;
          });
          if (t === -1) {
            return [].concat((0, o.default)(e), [s]);
          }
          var n = (0, o.default)(e);
          n[t] = s;
          return n;
        });
      }
      n = false;
    });
  }
  return [p, u.createElement(u.Fragment, null, i)];
}
};
