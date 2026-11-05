// webpack module 73965 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.DisabledContextProvider = undefined;
var i = n(require("./59496.js"));
var o = i.createContext(false);
exports.DisabledContextProvider = function (e) {
  var t = e.children;
  var r = e.disabled;
  var n = i.useContext(o);
  return i.createElement(o.Provider, {
    value: r ?? n
  }, t);
};
exports.default = o;
};
