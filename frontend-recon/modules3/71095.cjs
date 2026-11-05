// webpack module 71095 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  f: function () {
    return a;
  },
  m: function () {
    return o;
  }
});
var n = require("./88631.js");
var i = {
  basename: "/"
};
if (window.routerBase) {
  i.basename = window.routerBase;
}
var o = {
  NODE_ENV: "production"
}.__IS_SERVER ? null : (0, n.lX)(i);
function a(e = false) {
  if (!e) {
    o = (0, n.lX)(i);
  }
  return o;
}
};
