// webpack module 95314 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  t: function () {
    return u;
  }
});
var n = require("./23874.js");
var i = require("./59496.js");
var o = require("./86595.js");
var a = o;
var s = require("./48160.js");
function u(e, t) {
  var r = (0, i.useContext)(s.y);
  var o = (0, i.useRef)(t);
  o.current = t;
  var u = (0, i.useState)(function () {
    if (o.current) {
      return o.current(r.data[e]);
    } else {
      return r.data[e];
    }
  });
  var l = (0, n.Z)(u, 2);
  var c = l[0];
  var p = l[1];
  var d = (0, i.useRef)(c);
  d.current = c;
  var f = (0, i.useRef)(false);
  (0, i.useEffect)(function () {
    f.current = true;
    return function () {
      f.current = false;
    };
  }, []);
  (0, i.useEffect)(function () {
    function n(n) {
      if (f.current) {
        if (t && o.current) {
          var i = o.current(n);
          var s = d.current;
          if (!a(i, s)) {
            p(i);
          }
        } else {
          p(n);
        }
      } else {
        setTimeout(function () {
          r.data[e] = n;
          r.update(e);
        });
      }
    }
    try {
      r.callbacks[e].add(n);
      r.update(e);
    } catch (i) {
      r.callbacks[e] = new Set();
      r.callbacks[e].add(n);
      r.update(e);
    }
    return function () {
      r.callbacks[e].delete(n);
    };
  }, [e]);
  return c;
}
};
