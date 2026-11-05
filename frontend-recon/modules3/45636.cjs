// webpack module 45636 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SizeContextProvider = undefined;
var i = n(require("./59496.js"));
var o = i.createContext(undefined);
exports.SizeContextProvider = function (e) {
  var t = e.children;
  var r = e.size;
  return i.createElement(o.Consumer, null, function (e) {
    return i.createElement(o.Provider, {
      value: r || e
    }, t);
  });
};
exports.default = o;
};
