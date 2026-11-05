// webpack module 89528 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  n: function () {
    return o;
  }
});
var n = require("./59496.js");
var i = n.createContext(false);
function o(e) {
  var t = e.children;
  var r = e.disabled;
  var o = n.useContext(i);
  return n.createElement(i.Provider, {
    value: r ?? o
  }, t);
}
exports.Z = i;
};
