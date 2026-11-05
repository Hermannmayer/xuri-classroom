// webpack module 77966 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  q: function () {
    return o;
  }
});
var n = require("./59496.js");
var i = n.createContext(undefined);
function o(e) {
  var t = e.children;
  var r = e.size;
  return n.createElement(i.Consumer, null, function (e) {
    return n.createElement(i.Provider, {
      value: r || e
    }, t);
  });
}
exports.Z = i;
};
