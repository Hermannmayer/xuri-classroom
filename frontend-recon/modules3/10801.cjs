// webpack module 10801 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return i;
  }
});
var n = require("./59496.js");
function i(e, t) {
  var r = (0, n.useRef)([]);
  function i() {
    r.current.push(setTimeout(function () {
      var r;
      var n;
      var i;
      if (e.current?.input && ((r = e.current) === null || r === undefined ? undefined : r.input.getAttribute("type")) === "password" && ((n = e.current) === null || n === undefined ? undefined : n.input.hasAttribute("value"))) {
        if ((i = e.current) !== null && i !== undefined) {
          i.input.removeAttribute("value");
        }
      }
    }));
  }
  (0, n.useEffect)(function () {
    if (t) {
      i();
    }
    return function () {
      return r.current.forEach(function (e) {
        if (e) {
          clearTimeout(e);
        }
      });
    };
  }, []);
  return i;
}
};
