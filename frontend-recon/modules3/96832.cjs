// webpack module 96832 — body from webcrack
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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.staged = undefined;
const i = n(require("./59496.js"));
function o(e) {
  if (typeof e === "function") {
    return i.default.createElement(a, {
      stage: e
    });
  } else {
    return e;
  }
}
function a(e) {
  const t = e.stage();
  return o(t);
}
function s(e) {
  return function (t, r) {
    const n = e(t, r);
    return o(n);
  };
}
exports.staged = s;
};
