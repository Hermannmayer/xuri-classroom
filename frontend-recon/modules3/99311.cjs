// webpack module 99311 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return u;
  }
});
var n = require("./66439.js");
var i = require("./34256.js");
var o = require("./23874.js");
var a = require("./59496.js");
var s = require("./12552.js");
function u(e) {
  var t = a.useRef({});
  var r = a.useState([]);
  var u = (0, o.Z)(r, 2);
  var l = u[0];
  var c = u[1];
  function p(r) {
    var o = true;
    e.add(r, function (e, r) {
      var u = r.key;
      if (e && (!t.current[u] || o)) {
        var l = a.createElement(s.Z, (0, i.Z)({}, r, {
          holder: e
        }));
        t.current[u] = l;
        c(function (e) {
          var t = e.findIndex(function (e) {
            return e.key === r.key;
          });
          if (t === -1) {
            return [].concat((0, n.Z)(e), [l]);
          }
          var i = (0, n.Z)(e);
          i[t] = l;
          return i;
        });
      }
      o = false;
    });
  }
  return [p, a.createElement(a.Fragment, null, l)];
}
};
