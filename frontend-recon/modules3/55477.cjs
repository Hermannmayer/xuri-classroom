// webpack module 55477 — body from webcrack
module.exports = function (module, exports, require) {
function n(e) {
  return e && e.Math == Math && e;
}
module.exports = n(typeof globalThis == "object" && globalThis) || n(typeof window == "object" && window) || n(typeof self == "object" && self) || n(typeof require.g == "object" && require.g) || Function("return this")();
};
