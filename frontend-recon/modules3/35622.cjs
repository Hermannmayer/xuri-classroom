// webpack module 35622 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = o;
var i = n(require("./59496.js"));
function o(e, t, r) {
  var n = i.useRef({});
  if (!("value" in n.current) || !!r(n.current.condition, t)) {
    n.current.value = e();
    n.current.condition = t;
  }
  return n.current.value;
}
};
