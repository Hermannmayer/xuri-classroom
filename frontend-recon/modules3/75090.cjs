// webpack module 75090 — body from webcrack
module.exports = function (module, exports, require) {
var n = this && this.__importDefault || function (e) {
  if (e && e.__esModule) {
    return e;
  } else {
    return {
      default: e
    };
  }
};
exports.__esModule = true;
var i = n(require("./11895.js"));
var o = require("./6205.js");
function a(e, t) {
  var r = {};
  if (e && typeof e === "string") {
    (0, i.default)(e, function (e, n) {
      if (e && n) {
        r[(0, o.camelCase)(e, t)] = n;
      }
    });
    return r;
  } else {
    return r;
  }
}
exports.default = a;
};
